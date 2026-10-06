import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Server } from 'node:http';
import * as http from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

interface FixtureUser {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'TEAM_LEAD';
  passwordHash: string;
}

interface FixtureKudos {
  id: string;
  authorId: string;
  recipientId: string;
  message: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FixtureReaction {
  id: string;
  userId: string;
  kudosId: string;
  emoji: string;
  createdAt: Date;
}

interface BoardStream {
  waitFor(text: string): Promise<string>;
  close(): void;
}

const memberPassword = 'member-password';
const leadPassword = 'lead-password';
const memberId = 'member-1';
const leadId = 'lead-1';
const recipientId = 'recipient-1';

const users: FixtureUser[] = [];
let kudos: FixtureKudos[] = [];
let reactions: FixtureReaction[] = [];
let nextKudosId = 1;
let nextReactionId = 1;

const prismaFixture = {
  user: {
    findUnique: jest.fn(async ({ where }: { where: { id?: string; email?: string } }) =>
      users.find((user) =>
        where.email ? user.email === where.email : user.id === where.id,
      ) ?? null,
    ),
  },
  kudos: {
    create: jest.fn(async ({ data }: { data: Pick<FixtureKudos, 'authorId' | 'recipientId' | 'message'> }) => {
      const now = new Date();
      const record: FixtureKudos = {
        id: `created-${nextKudosId++}`,
        ...data,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      };
      kudos.push(record);
      return record;
    }),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
      kudos.find((record) => record.id === where.id) ?? null,
    ),
    findMany: jest.fn(async ({
      where,
      skip,
      take,
    }: {
      where: { isHidden: boolean };
      skip: number;
      take: number;
    }) =>
      kudos
        .filter((record) => record.isHidden === where.isHidden)
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() ||
            right.id.localeCompare(left.id),
        )
        .slice(skip, skip + take),
    ),
    update: jest.fn(async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { isHidden: boolean };
    }) => {
      const record = kudos.find((item) => item.id === where.id);
      if (!record) throw new Error('Kudos not found');
      Object.assign(record, data);
      return record;
    }),
  },
  reaction: {
    create: jest.fn(async ({ data }: { data: Omit<FixtureReaction, 'id' | 'createdAt'> }) => {
      if (reactions.some((item) => item.userId === data.userId && item.kudosId === data.kudosId)) {
        throw { code: 'P2002' };
      }
      const reaction: FixtureReaction = {
        id: `reaction-${nextReactionId++}`,
        ...data,
        createdAt: new Date(),
      };
      reactions.push(reaction);
      return reaction;
    }),
  },
};

function openBoardStream(server: Server, cookie: string): Promise<BoardStream> {
  return new Promise((resolve, reject) => {
    let buffered = '';
    const waiters: Array<{ text: string; resolve: (match: string) => void }> = [];
    const streamRequest = http.get(
      {
        hostname: '127.0.0.1',
        port: (server.address() as { port: number }).port,
        path: '/kudos/events',
        headers: { Cookie: cookie, Accept: 'text/event-stream' },
      },
      (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Expected SSE status 200, got ${response.statusCode}`));
          response.resume();
          return;
        }
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          buffered += chunk;
          for (let index = waiters.length - 1; index >= 0; index -= 1) {
            const waiter = waiters[index];
            if (buffered.includes(waiter.text)) {
              waiters.splice(index, 1);
              waiter.resolve(buffered);
            }
          }
        });
        resolve({
          waitFor(text: string): Promise<string> {
            if (buffered.includes(text)) return Promise.resolve(buffered);
            return new Promise((waiterResolve) => waiters.push({ text, resolve: waiterResolve }));
          },
          close(): void {
            streamRequest.destroy();
          },
        });
      },
    );
    streamRequest.setTimeout(5000, () => {
      streamRequest.destroy(new Error('Timed out opening board event stream'));
    });
    streamRequest.on('error', reject);
  });
}

describe('assembled API end-to-end HTTP flows', () => {
  let app: INestApplication;
  let server: Server;
  let memberCookie: string;
  let leadCookie: string;

  async function signIn(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email, password })
      .expect(201);
    const cookies = response.headers['set-cookie'] as unknown as string[];
    const sessionCookie = cookies.find((cookie) => cookie.startsWith('session='));
    if (!sessionCookie) throw new Error('Sign-in did not set a session cookie');
    return sessionCookie.split(';')[0];
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-session-secret';
    users.splice(
      0,
      users.length,
      {
        id: memberId,
        email: 'member@example.test',
        name: 'API Member',
        role: 'MEMBER',
        passwordHash: await bcrypt.hash(memberPassword, 4),
      },
      {
        id: leadId,
        email: 'lead@example.test',
        name: 'API Team Lead',
        role: 'TEAM_LEAD',
        passwordHash: await bcrypt.hash(leadPassword, 4),
      },
      {
        id: recipientId,
        email: 'recipient@example.test',
        name: 'Kudos Recipient',
        role: 'MEMBER',
        passwordHash: await bcrypt.hash('recipient-password', 4),
      },
    );

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaFixture)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    server = app.getHttpServer() as Server;
    memberCookie = await signIn('member@example.test', memberPassword);
    leadCookie = await signIn('lead@example.test', leadPassword);
  });

  beforeEach(() => {
    kudos = [];
    reactions = [];
    nextKudosId = 1;
    nextReactionId = 1;
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  it('[AC-2] signs in over HTTP and rejects invalid credential request shapes with Nest 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: 'not-an-email', password: memberPassword, unexpected: true })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.error).toBe('Bad Request');
    expect(memberCookie).toMatch(/^session=.+/);
  });

  it('[AC-3] lets an authenticated member create kudos and rejects anonymous writes', async () => {
    await request(app.getHttpServer())
      .post('/kudos')
      .send({ recipientId, message: 'Thank you for the thoughtful review!' })
      .expect(401);

    const response = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId, message: 'Thank you for the thoughtful review!' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'created-1',
      authorId: memberId,
      recipientId,
      message: 'Thank you for the thoughtful review!',
      isHidden: false,
    });
  });

  it('[AC-5] serves visible board pages newest first with at most twenty kudos', async () => {
    kudos = Array.from({ length: 23 }, (_, index) => ({
      id: `board-${String(index + 1).padStart(2, '0')}`,
      authorId: memberId,
      recipientId,
      message: `Board item ${index + 1}`,
      isHidden: false,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
      updatedAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
    }));

    const firstPage = await request(app.getHttpServer())
      .get('/kudos')
      .query({ page: 1 })
      .set('Cookie', memberCookie)
      .expect(200);
    const secondPage = await request(app.getHttpServer())
      .get('/kudos')
      .query({ page: 2 })
      .set('Cookie', memberCookie)
      .expect(200);

    expect(firstPage.body).toHaveLength(20);
    expect(firstPage.body[0].id).toBe('board-23');
    expect(firstPage.body[19].id).toBe('board-04');
    expect(secondPage.body.map((item: { id: string }) => item.id)).toEqual([
      'board-03',
      'board-02',
      'board-01',
    ]);
  });

  it('[AC-7] allows a member to add one reaction to kudos through HTTP', async () => {
    kudos.push({
      id: 'reactable',
      authorId: memberId,
      recipientId,
      message: 'Great work',
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .post('/kudos/reactable/reactions')
      .set('Cookie', memberCookie)
      .send({ emoji: '🎉' })
      .expect(201);

    expect(response.body).toMatchObject({
      userId: memberId,
      kudosId: 'reactable',
      emoji: '🎉',
    });
    await request(app.getHttpServer())
      .post('/kudos/reactable/reactions')
      .set('Cookie', memberCookie)
      .send({ emoji: '👏' })
      .expect(409);
  });

  it('[AC-8] rejects member moderation and allows a signed-in team lead to hide kudos', async () => {
    kudos.push({
      id: 'moderated',
      authorId: memberId,
      recipientId,
      message: 'Needs review',
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer()).post('/kudos/moderated/hide').expect(401);
    await request(app.getHttpServer())
      .post('/kudos/moderated/hide')
      .set('Cookie', memberCookie)
      .expect(403);

    await request(app.getHttpServer())
      .post('/kudos/moderated/hide')
      .set('Cookie', leadCookie)
      .expect(201);

    const board = await request(app.getHttpServer())
      .get('/kudos')
      .set('Cookie', memberCookie)
      .expect(200);
    expect(kudos.find((item) => item.id === 'moderated')?.isHidden).toBe(true);
    expect(board.body).toEqual([]);
  });

  it('[AC-6] publishes added and removed kudos events to an authenticated live board stream', async () => {
    const stream = await openBoardStream(server, memberCookie);
    try {
      const created = await request(app.getHttpServer())
        .post('/kudos')
        .set('Cookie', memberCookie)
        .send({ recipientId, message: 'Visible without reloading' })
        .expect(201);
      const addedEvent = await stream.waitFor(`"id":"${created.body.id}"`);
      expect(addedEvent).toContain('event: kudos-added');
      expect(addedEvent).toContain('"type":"added"');

      await request(app.getHttpServer())
        .post(`/kudos/${created.body.id}/hide`)
        .set('Cookie', leadCookie)
        .expect(201);
      const removedEvent = await stream.waitFor(`"type":"removed","id":"${created.body.id}"`);
      expect(removedEvent).toContain('event: kudos-removed');
    } finally {
      stream.close();
    }
  });
});
