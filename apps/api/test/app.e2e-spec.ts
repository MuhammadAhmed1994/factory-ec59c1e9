import { AddressInfo } from 'node:net';
import * as http from 'node:http';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { configureApp } from '../src/app.config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClientMock {},
}));

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'TEAM_LEAD';
  passwordHash: string;
}

interface TestKudos {
  id: string;
  authorId: string;
  recipientId: string;
  message: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
  recipient: { id: string; name: string };
}

const signingSecret = 'assembled-api-e2e-secret';
const password = 'test-password';
const users: TestUser[] = [
  {
    id: 'member-1',
    email: 'member@example.test',
    name: 'Taylor Member',
    role: 'MEMBER',
    passwordHash: bcrypt.hashSync(password, 4),
  },
  {
    id: 'lead-1',
    email: 'lead@example.test',
    name: 'Lee Lead',
    role: 'TEAM_LEAD',
    passwordHash: bcrypt.hashSync(password, 4),
  },
];

let kudosRows: TestKudos[] = [];
let reactions: Array<Record<string, unknown>> = [];
let nextKudosId = 1;
let nextReactionId = 1;

const prismaMock = {
  user: {
    findUnique: jest.fn(async ({ where }: { where: { email: string } }) =>
      users.find((user) => user.email === where.email) ?? null,
    ),
  },
  kudos: {
    create: jest.fn(async ({ data }: { data: { authorId: string; recipientId: string; message: string } }) => {
      const author = users.find((user) => user.id === data.authorId)!;
      const recipient = users.find((user) => user.id === data.recipientId)!;
      const now = new Date();
      const row: TestKudos = {
        id: `kudos-${nextKudosId++}`,
        ...data,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
        author: { id: author.id, name: author.name },
        recipient: { id: recipient.id, name: recipient.name },
      };
      kudosRows.push(row);
      return row;
    }),
    findMany: jest.fn(async ({ where, orderBy, skip, take }: {
      where: { isHidden: boolean };
      orderBy: Array<Record<string, 'asc' | 'desc'>>;
      skip: number;
      take: number;
    }) => {
      const rows = kudosRows
        .filter((row) => row.isHidden === where.isHidden)
        .sort((left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id),
        );
      return rows.slice(skip, skip + take);
    }),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
      kudosRows.find((row) => row.id === where.id) ?? null,
    ),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: { isHidden: boolean } }) => {
      const row = kudosRows.find((item) => item.id === where.id)!;
      row.isHidden = data.isHidden;
      row.updatedAt = new Date();
      return { id: row.id, isHidden: row.isHidden };
    }),
  },
  reaction: {
    create: jest.fn(async ({ data }: { data: { userId: string; kudosId: string; emoji: string } }) => {
      const now = new Date();
      const reaction = {
        id: `reaction-${nextReactionId++}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      reactions.push(reaction);
      return reaction;
    }),
  },
};

describe('Assembled API over HTTP', () => {
  let app: INestApplication;
  let previousSecret: string | undefined;

  beforeAll(async () => {
    previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = signingSecret;
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.listen(0);
  });

  beforeEach(() => {
    kudosRows = [];
    reactions = [];
    nextKudosId = 1;
    nextReactionId = 1;
  });

  afterAll(async () => {
    await app.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  async function signIn(user: TestUser): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: user.email, password });
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ id: user.id, email: user.email, role: user.role });
    const cookieHeader = response.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : String(cookieHeader);
    expect(cookie).toContain('HttpOnly');
    return cookie.split(';')[0];
  }

  async function createKudos(cookie: string, message = 'Great work!'): Promise<request.Response> {
    return request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message });
  }

  it('[AC-2] signs in over HTTP and establishes a secure session cookie', async () => {
    const cookie = await signIn(users[0]);
    expect(cookie).toMatch(/^session=/);
  });

  it('[AC-3] lets an authenticated member create kudos and rejects invalid payloads with HTTP 400', async () => {
    const cookie = await signIn(users[0]);
    const created = await createKudos(cookie, 'Thanks for the thoughtful review!');
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      authorId: 'member-1',
      recipientId: 'lead-1',
      message: 'Thanks for the thoughtful review!',
      isHidden: false,
    });

    const invalid = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'x'.repeat(281) });
    expect(invalid.status).toBe(400);
    expect(invalid.body.statusCode).toBe(400);
  });

  it('[AC-5] paginates the visible board in newest-first pages of at most twenty', async () => {
    const cookie = await signIn(users[0]);
    for (let index = 0; index < 22; index += 1) {
      const response = await createKudos(cookie, `Kudos ${index}`);
      expect(response.status).toBe(201);
    }

    const pageOne = await request(app.getHttpServer()).get('/kudos?page=1').set('Cookie', cookie);
    const pageTwo = await request(app.getHttpServer()).get('/kudos?page=2').set('Cookie', cookie);
    expect(pageOne.status).toBe(200);
    expect(pageOne.body).toHaveLength(20);
    expect(pageOne.body[0].id).toBe('kudos-22');
    expect(pageTwo.body).toHaveLength(2);
    expect(pageTwo.body[0].id).toBe('kudos-2');
  });

  it('[AC-6] publishes a newly posted kudos through the HTTP server-sent events stream', async () => {
    const cookie = await signIn(users[0]);
    const server = app.getHttpServer();
    const address = server.address() as AddressInfo;
    let responseStream: http.IncomingMessage | undefined;
    let collected = '';
    const pendingEvents: Array<{ fragment: string; resolve: (event: string) => void; reject: (error: Error) => void }> = [];

    const streamReady = new Promise<void>((resolve, reject) => {
      const stream = http.get({
        host: '127.0.0.1',
        port: address.port,
        path: '/kudos/events',
        headers: { Cookie: cookie },
      }, (response) => {
        responseStream = response;
        if (response.statusCode !== 200) {
          reject(new Error(`SSE endpoint returned ${response.statusCode}`));
          return;
        }
        response.on('data', (chunk: Buffer) => {
          collected += chunk.toString('utf8');
          for (let index = pendingEvents.length - 1; index >= 0; index -= 1) {
            const pending = pendingEvents[index];
            if (collected.includes(pending.fragment)) {
              pending.resolve(collected);
              pendingEvents.splice(index, 1);
            }
          }
        });
        resolve();
      });
      stream.on('error', reject);
    });

    try {
      await streamReady;
      const created = await createKudos(cookie, 'This appears live!');
      expect(created.status).toBe(201);
      const event = await new Promise<string>((resolve, reject) => {
        const fragment = created.body.id;
        if (collected.includes(fragment)) {
          resolve(collected);
          return;
        }
        pendingEvents.push({ fragment, resolve, reject });
        setTimeout(() => reject(new Error('Timed out waiting for the board event')), 1500);
      });
      expect(event).toContain('kudos-added');
    } finally {
      responseStream?.destroy();
    }
  });

  it('[AC-7] allows an authenticated member to add an emoji reaction to kudos over HTTP', async () => {
    const cookie = await signIn(users[0]);
    const created = await createKudos(cookie);
    const response = await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/reactions`)
      .set('Cookie', cookie)
      .send({ emoji: '🎉' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      userId: 'member-1',
      kudosId: created.body.id,
      emoji: '🎉',
    });
  });

  it('[AC-8] permits leads to hide kudos and rejects member and anonymous hide requests', async () => {
    const memberCookie = await signIn(users[0]);
    const created = await createKudos(memberCookie);

    const anonymous = await request(app.getHttpServer()).post(`/kudos/${created.body.id}/hide`);
    expect(anonymous.status).toBe(401);

    const forbidden = await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', memberCookie);
    expect(forbidden.status).toBe(403);

    const leadCookie = await signIn(users[1]);
    const hidden = await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', leadCookie);
    expect(hidden.status).toBe(201);
    expect(hidden.body).toEqual({ id: created.body.id, isHidden: true });

    const board = await request(app.getHttpServer()).get('/kudos').set('Cookie', memberCookie);
    expect(board.body).toEqual([]);
  });

  it('[AC-3] rejects unauthenticated member operations', async () => {
    const response = await request(app.getHttpServer())
      .post('/kudos')
      .send({ recipientId: 'lead-1', message: 'No session' });
    expect(response.status).toBe(401);
  });
});
