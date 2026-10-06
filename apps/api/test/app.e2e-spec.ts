import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AddressInfo } from 'node:net';
import * as http from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';
import { PrismaService } from '../src/prisma/prisma.service';

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
  reactions: Array<Record<string, unknown>>;
}

const users = new Map<string, TestUser>();
const kudosItems = new Map<string, TestKudos>();
const reactions: Array<Record<string, unknown>> = [];
let application: INestApplication;
let nextId = 0;

function prismaStub(): Record<string, unknown> {
  return {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) =>
        [...users.values()].find((user) =>
          where.email ? user.email === where.email : user.id === where.id,
        ) ?? null,
    },
    kudos: {
      create: async ({ data }: { data: { authorId: string; recipientId: string; message: string } }) => {
        const author = users.get(data.authorId);
        const recipient = users.get(data.recipientId);
        if (!author || !recipient) {
          const error = new Error('Foreign key constraint failed') as Error & { code: string };
          error.code = 'P2003';
          throw error;
        }
        const id = `kudos-${++nextId}`;
        const now = new Date();
        const created: TestKudos = {
          id,
          authorId: data.authorId,
          recipientId: data.recipientId,
          message: data.message,
          isHidden: false,
          createdAt: now,
          updatedAt: now,
          author: { id: author.id, name: author.name },
          recipient: { id: recipient.id, name: recipient.name },
          reactions: [],
        };
        kudosItems.set(id, created);
        return created;
      },
      findMany: async ({
        where,
        orderBy,
        skip,
        take,
      }: {
        where: { isHidden?: boolean };
        orderBy: Array<Record<string, string>>;
        skip: number;
        take: number;
      }) => {
        const direction = orderBy[0]?.createdAt === 'desc' ? -1 : 1;
        return [...kudosItems.values()]
          .filter((item) => where.isHidden === undefined || item.isHidden === where.isHidden)
          .sort(
            (first, second) =>
              direction * (first.createdAt.getTime() - second.createdAt.getTime()) ||
              (first.id < second.id ? 1 : -1),
          )
          .slice(skip, skip + take);
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        kudosItems.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: { isHidden: boolean } }) => {
        const item = kudosItems.get(where.id);
        if (!item) throw new Error('Kudos not found');
        item.isHidden = data.isHidden;
        item.updatedAt = new Date();
        return { id: item.id, isHidden: item.isHidden };
      },
    },
    reaction: {
      create: async ({ data }: { data: { userId: string; kudosId: string; emoji: string } }) => {
        if (reactions.some((item) => item.userId === data.userId && item.kudosId === data.kudosId)) {
          const error = new Error('Unique constraint failed') as Error & { code: string };
          error.code = 'P2002';
          throw error;
        }
        const now = new Date();
        const reaction = { id: `reaction-${reactions.length + 1}`, ...data, createdAt: now, updatedAt: now };
        reactions.push(reaction);
        return reaction;
      },
    },
  };
}

async function signIn(email = 'member@example.test'): Promise<string> {
  const response = await request(application.getHttpServer())
    .post('/auth/sessions')
    .send({ email, password: 'test-password' })
    .expect(201);
  expect(response.headers['set-cookie']).toBeDefined();
  expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  return response.headers['set-cookie'][0].split(';')[0];
}

describe('assembled API end-to-end', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-session-secret';
    const passwordHash = await bcrypt.hash('test-password', 4);
    users.set('member-1', {
      id: 'member-1',
      email: 'member@example.test',
      name: 'Test Member',
      role: 'MEMBER',
      passwordHash,
    });
    users.set('lead-1', {
      id: 'lead-1',
      email: 'lead@example.test',
      name: 'Test Lead',
      role: 'TEAM_LEAD',
      passwordHash,
    });

    const testingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub())
      .compile();

    application = testingModule.createNestApplication();
    configureApp(application);
    await application.listen(0);
  });

  beforeEach(() => {
    kudosItems.clear();
    reactions.length = 0;
    nextId = 0;
  });

  afterAll(async () => {
    await application.close();
    delete process.env.JWT_SECRET;
  });

  it('signs in with valid credentials and uses the returned session for member operations', async () => {
    const cookie = await signIn();
    const created = await request(application.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'Thanks for your help!' })
      .expect(201);

    expect(created.body).toMatchObject({
      authorId: 'member-1',
      recipientId: 'lead-1',
      message: 'Thanks for your help!',
      isHidden: false,
    });

    const reacted = await request(application.getHttpServer())
      .post(`/kudos/${created.body.id}/reactions`)
      .set('Cookie', cookie)
      .send({ emoji: '🎉' })
      .expect(201);
    expect(reacted.body).toMatchObject({
      userId: 'member-1',
      kudosId: created.body.id,
      emoji: '🎉',
    });
  });

  it('rejects anonymous requests, invalid request shapes, and member-only moderation attempts', async () => {
    await request(application.getHttpServer()).get('/kudos').expect(401);
    const cookie = await signIn();

    await request(application.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'valid', unexpected: true })
      .expect(400);

    const created = await request(application.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'not authorized to hide' })
      .expect(201);
    await request(application.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', cookie)
      .expect(403);
  });

  it('returns visible board pages in newest-first batches of twenty', async () => {
    const cookie = await signIn();
    for (let index = 0; index < 22; index += 1) {
      const createdAt = new Date(Date.UTC(2026, 0, index + 1));
      const author = users.get('member-1')!;
      const recipient = users.get('lead-1')!;
      const id = `page-item-${String(index + 1).padStart(2, '0')}`;
      kudosItems.set(id, {
        id,
        authorId: author.id,
        recipientId: recipient.id,
        message: `Message ${index + 1}`,
        isHidden: false,
        createdAt,
        updatedAt: createdAt,
        author: { id: author.id, name: author.name },
        recipient: { id: recipient.id, name: recipient.name },
        reactions: [],
      });
    }

    const firstPage = await request(application.getHttpServer())
      .get('/kudos')
      .set('Cookie', cookie)
      .expect(200);
    const secondPage = await request(application.getHttpServer())
      .get('/kudos?page=2')
      .set('Cookie', cookie)
      .expect(200);

    expect(firstPage.body).toHaveLength(20);
    expect(firstPage.body[0].id).toBe('page-item-22');
    expect(firstPage.body[19].id).toBe('page-item-03');
    expect(secondPage.body.map((item: { id: string }) => item.id)).toEqual([
      'page-item-02',
      'page-item-01',
    ]);
  });

  it('streams newly created kudos over the authenticated board events endpoint', async () => {
    const cookie = await signIn();
    const { port } = application.getHttpServer().address() as AddressInfo;
    let connected!: () => void;
    const streamConnected = new Promise<void>((resolve) => {
      connected = resolve;
    });
    let resolveEvent!: (data: string) => void;
    let rejectEvent!: (error: Error) => void;
    const eventReceived = new Promise<string>((resolve, reject) => {
      resolveEvent = resolve;
      rejectEvent = reject;
    });

    const streamRequest = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/kudos/events',
        headers: { Cookie: cookie },
      },
      (response) => {
        expect(response.headers['content-type']).toContain('text/event-stream');
        connected();
        response.setEncoding('utf8');
        let received = '';
        response.on('data', (chunk: string) => {
          received += chunk;
          if (received.includes('kudos-added')) {
            resolveEvent(received);
            streamRequest.destroy();
          }
        });
      },
    );
    streamRequest.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'ECONNRESET') rejectEvent(error);
    });

    await streamConnected;
    const created = await request(application.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'Live update' })
      .expect(201);
    const event = await eventReceived;
    expect(event).toContain('kudos-added');
    expect(event).toContain(created.body.id);
  });

  it('allows a team lead to hide kudos and removes it from subsequent board reads', async () => {
    const memberCookie = await signIn();
    const created = await request(application.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId: 'lead-1', message: 'Remove this from the board' })
      .expect(201);
    const leadCookie = await signIn('lead@example.test');

    const hidden = await request(application.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', leadCookie)
      .expect(201);
    expect(hidden.body).toEqual({ id: created.body.id, isHidden: true });

    const board = await request(application.getHttpServer())
      .get('/kudos')
      .set('Cookie', leadCookie)
      .expect(200);
    expect(board.body).toEqual([]);
  });
});
