import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { IncomingMessage } from 'node:http';
import { AddressInfo } from 'node:net';
import * as http from 'node:http';
import request from 'supertest';
import { configureApp } from '../src/app.config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const signingSecret = 'test-session-signing-secret';
const memberPassword = 'member-password';
const leadPassword = 'lead-password';

type UserFixture = {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'TEAM_LEAD';
  passwordHash: string;
};

type KudosFixture = {
  id: string;
  authorId: string;
  recipientId: string;
  message: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
  recipient: { id: string; name: string };
};

const users: UserFixture[] = [
  {
    id: 'member-1',
    email: 'member@example.test',
    name: 'Taylor Member',
    role: 'MEMBER',
    passwordHash: bcrypt.hashSync(memberPassword, 4),
  },
  {
    id: 'lead-1',
    email: 'lead@example.test',
    name: 'Morgan Lead',
    role: 'TEAM_LEAD',
    passwordHash: bcrypt.hashSync(leadPassword, 4),
  },
];
const kudosRows: KudosFixture[] = [];
const reactionRows: Array<Record<string, unknown>> = [];
let nextKudosId = 0;
let nextReactionId = 0;

function createKudosFixture(
  id: string,
  createdAt: Date = new Date(),
  isHidden = false,
): KudosFixture {
  return {
    id,
    authorId: 'member-1',
    recipientId: 'lead-1',
    message: 'Thank you for your help!',
    isHidden,
    createdAt,
    updatedAt: createdAt,
    author: { id: 'member-1', name: 'Taylor Member' },
    recipient: { id: 'lead-1', name: 'Morgan Lead' },
  };
}

const prismaMock = {
  user: {
    findUnique: async ({ where }: { where: { email: string } }): Promise<UserFixture | null> =>
      users.find((user) => user.email === where.email) ?? null,
  },
  kudos: {
    create: async ({ data }: { data: { authorId: string; recipientId: string; message: string } }): Promise<KudosFixture> => {
      nextKudosId += 1;
      const author = users.find((user) => user.id === data.authorId);
      const recipient = users.find((user) => user.id === data.recipientId);
      const now = new Date(Date.now() + nextKudosId);
      const row: KudosFixture = {
        id: `kudos-${nextKudosId}`,
        ...data,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
        author: { id: data.authorId, name: author?.name ?? 'Unknown' },
        recipient: { id: data.recipientId, name: recipient?.name ?? 'Unknown' },
      };
      kudosRows.push(row);
      return row;
    },
    findMany: async ({ skip, take }: { skip: number; take: number }): Promise<KudosFixture[]> =>
      kudosRows
        .filter((row) => !row.isHidden)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id))
        .slice(skip, skip + take),
    findUnique: async ({ where }: { where: { id: string } }): Promise<{ id: string } | null> =>
      kudosRows.some((row) => row.id === where.id) ? { id: where.id } : null,
    update: async ({ where }: { where: { id: string } }): Promise<{ id: string; isHidden: boolean }> => {
      const row = kudosRows.find((candidate) => candidate.id === where.id);
      if (!row) throw new Error('Fixture kudos not found');
      row.isHidden = true;
      return { id: row.id, isHidden: true };
    },
  },
  reaction: {
    create: async ({ data }: { data: { userId: string; kudosId: string; emoji: string } }): Promise<Record<string, unknown>> => {
      if (reactionRows.some((row) => row.userId === data.userId && row.kudosId === data.kudosId)) {
        throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      }
      nextReactionId += 1;
      const now = new Date();
      const reaction = { id: `reaction-${nextReactionId}`, ...data, createdAt: now, updatedAt: now };
      reactionRows.push(reaction);
      return reaction;
    },
  },
};

let app: INestApplication;
let previousSecret: string | undefined;

async function signIn(email: string, password: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/sessions')
    .send({ email, password })
    .expect(201);
  const setCookie = response.headers['set-cookie'];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!cookie) throw new Error('Sign-in response did not set the session cookie');
  return cookie.split(';', 1)[0];
}

async function openEventStream(cookie: string): Promise<IncomingMessage> {
  const address = app.getHttpServer().address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const streamRequest = http.get(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path: '/kudos/events',
        headers: { Cookie: cookie },
      },
      resolve,
    );
    streamRequest.once('error', reject);
  });
}

function nextSseMessage(stream: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffered = '';
    const timeout = setTimeout(() => {
      stream.removeListener('data', onData);
      reject(new Error('Timed out waiting for a board event'));
    }, 3000);
    const onData = (chunk: Buffer): void => {
      buffered += chunk.toString('utf8');
      const end = buffered.indexOf('\n\n');
      if (end !== -1) {
        clearTimeout(timeout);
        stream.removeListener('data', onData);
        resolve(buffered.slice(0, end));
      }
    };
    stream.on('data', onData);
  });
}

describe('Assembled API over HTTP', () => {
  beforeAll(async () => {
    previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = signingSecret;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);
  });

  beforeEach(() => {
    kudosRows.length = 0;
    reactionRows.length = 0;
    nextKudosId = 0;
    nextReactionId = 0;
  });

  afterAll(async () => {
    await app.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('[AC-2] valid sign-in establishes an authenticated HTTP session', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: 'member@example.test', password: memberPassword })
      .expect(201);

    expect(response.body.user).toEqual({
      id: 'member-1',
      email: 'member@example.test',
      name: 'Taylor Member',
      role: 'MEMBER',
    });
    expect(response.headers['set-cookie'][0]).toMatch(/^session=.*HttpOnly.*Secure.*SameSite=Lax/);
  });

  it('[AC-3] an authenticated member can create kudos and invalid input receives the default 400', async () => {
    const cookie = await signIn('member@example.test', memberPassword);
    const created = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'Thank you for your support!' })
      .expect(201);
    expect(created.body).toMatchObject({
      id: 'kudos-1',
      authorId: 'member-1',
      recipientId: 'lead-1',
      message: 'Thank you for your support!',
      isHidden: false,
    });

    await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'x'.repeat(281) })
      .expect(400);
  });

  it('[AC-5] the board returns visible kudos newest first in pages of at most 20', async () => {
    for (let index = 1; index <= 23; index += 1) {
      kudosRows.push(createKudosFixture(`kudos-${index}`, new Date(index * 1000)));
    }
    const cookie = await signIn('member@example.test', memberPassword);
    const firstPage = await request(app.getHttpServer())
      .get('/kudos')
      .set('Cookie', cookie)
      .expect(200);
    expect(firstPage.body).toHaveLength(20);
    expect(firstPage.body[0].id).toBe('kudos-23');
    expect(firstPage.body[19].id).toBe('kudos-4');

    const secondPage = await request(app.getHttpServer())
      .get('/kudos?page=2')
      .set('Cookie', cookie)
      .expect(200);
    expect(secondPage.body.map((item: KudosFixture) => item.id)).toEqual(['kudos-3', 'kudos-2', 'kudos-1']);
  });

  it('[AC-6] connected board event streams receive newly posted kudos', async () => {
    const memberCookie = await signIn('member@example.test', memberPassword);
    const stream = await openEventStream(memberCookie);
    try {
      expect(stream.headers['content-type']).toContain('text/event-stream');
      const nextMessage = nextSseMessage(stream);
      await request(app.getHttpServer())
        .post('/kudos')
        .set('Cookie', memberCookie)
        .send({ recipientId: 'lead-1', message: 'A live board update' })
        .expect(201);
      expect(await nextMessage).toContain('kudos-added');
    } finally {
      stream.destroy();
    }
  });

  it('[AC-7] a signed-in member can add an emoji reaction to kudos', async () => {
    kudosRows.push(createKudosFixture('kudos-react'));
    const cookie = await signIn('member@example.test', memberPassword);
    const response = await request(app.getHttpServer())
      .post('/kudos/kudos-react/reactions')
      .set('Cookie', cookie)
      .send({ emoji: '🎉' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'reaction-1',
      userId: 'member-1',
      kudosId: 'kudos-react',
      emoji: '🎉',
    });
  });

  it('[AC-8] only a team lead can hide kudos and unauthorized requests are rejected', async () => {
    const memberCookie = await signIn('member@example.test', memberPassword);
    const leadCookie = await signIn('lead@example.test', leadPassword);
    const created = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId: 'lead-1', message: 'Should be moderated' })
      .expect(201);

    await request(app.getHttpServer()).post(`/kudos/${created.body.id}/hide`).expect(401);
    await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', memberCookie)
      .expect(403);
    const hidden = await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', leadCookie)
      .expect(201);
    expect(hidden.body).toEqual({ id: created.body.id, isHidden: true });
  });

  it('[AC-9] hiding kudos is delivered as a live removal event and removes it from the board', async () => {
    kudosRows.push(createKudosFixture('kudos-live-hide'));
    const leadCookie = await signIn('lead@example.test', leadPassword);
    const stream = await openEventStream(leadCookie);
    try {
      expect(stream.headers['content-type']).toContain('text/event-stream');
      const nextMessage = nextSseMessage(stream);
      await request(app.getHttpServer())
        .post('/kudos/kudos-live-hide/hide')
        .set('Cookie', leadCookie)
        .expect(201);
      expect(await nextMessage).toContain('kudos-removed');

      const board = await request(app.getHttpServer())
        .get('/kudos')
        .set('Cookie', leadCookie)
        .expect(200);
      expect(board.body).toEqual([]);
    } finally {
      stream.destroy();
    }
  });

  it('[AC-3] protected member operations and invalid pagination reject bad requests', async () => {
    await request(app.getHttpServer())
      .post('/kudos')
      .send({ recipientId: 'lead-1', message: 'Must be signed in' })
      .expect(401);
    const cookie = await signIn('member@example.test', memberPassword);
    await request(app.getHttpServer())
      .get('/kudos?page=0')
      .set('Cookie', cookie)
      .expect(400);
  });
});
