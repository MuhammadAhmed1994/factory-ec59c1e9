import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { configureApp } from '../src/app.config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
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
}

const password = 'correct-password';
const sessionSecret = 'assembled-api-e2e-secret';
const users = new Map<string, TestUser>();
const kudosRecords = new Map<string, TestKudos>();
const reactions: Array<Record<string, unknown>> = [];
let app: INestApplication;
let createdKudosId = '';

const prismaMock = {
  user: {
    findUnique: async (args: { where: { id?: string; email?: string } }) => {
      const user = args.where.email
        ? [...users.values()].find((candidate) => candidate.email === args.where.email)
        : args.where.id
          ? users.get(args.where.id)
          : undefined;
      return user ?? null;
    },
  },
  kudos: {
    create: async (args: { data: { authorId: string; recipientId: string; message: string } }) => {
      const now = new Date();
      const record: TestKudos = {
        id: `created-${kudosRecords.size + 1}`,
        ...args.data,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      };
      kudosRecords.set(record.id, record);
      return record;
    },
    findMany: async (args: { skip: number; take: number }) =>
      [...kudosRecords.values()]
        .filter((record) => !record.isHidden)
        .sort(
          (first, second) =>
            second.createdAt.getTime() - first.createdAt.getTime() ||
            second.id.localeCompare(first.id),
        )
        .slice(args.skip, args.skip + args.take),
    findUnique: async (args: { where: { id: string } }) =>
      kudosRecords.get(args.where.id) ?? null,
    updateMany: async (args: { where: { id: string }; data: { isHidden: boolean } }) => {
      const record = kudosRecords.get(args.where.id);
      if (!record) return { count: 0 };
      record.isHidden = args.data.isHidden;
      record.updatedAt = new Date();
      return { count: 1 };
    },
  },
  reaction: {
    create: async (args: {
      data: { userId: string; kudosId: string; emoji: string };
    }) => {
      const now = new Date();
      const reaction = {
        id: `reaction-${reactions.length + 1}`,
        ...args.data,
        createdAt: now,
        updatedAt: now,
      };
      reactions.push(reaction);
      return reaction;
    },
  },
};

async function signIn(email: string): Promise<{ cookie: string; header: string }> {
  const response = await request(app.getHttpServer())
    .post('/auth/sessions')
    .send({ email, password })
    .expect(201);
  const cookieHeader = (response.headers['set-cookie'] as unknown as string[])[0];
  return { cookie: cookieHeader.split(';')[0], header: cookieHeader };
}

describe('assembled API over HTTP', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = sessionSecret;
    const passwordHash = await bcrypt.hash(password, 4);
    users.set('member-1', {
      id: 'member-1',
      email: 'member@example.test',
      name: 'Development Member',
      role: 'MEMBER',
      passwordHash,
    });
    users.set('lead-1', {
      id: 'lead-1',
      email: 'team-lead@example.test',
      name: 'Development Team Lead',
      role: 'TEAM_LEAD',
      passwordHash,
    });

    for (let index = 0; index < 21; index += 1) {
      const createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index));
      const record: TestKudos = {
        id: `seed-${String(index).padStart(2, '0')}`,
        authorId: 'member-1',
        recipientId: 'lead-1',
        message: `Existing kudos ${index}`,
        isHidden: false,
        createdAt,
        updatedAt: createdAt,
      };
      kudosRecords.set(record.id, record);
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  it('[AC-2] signs in through HTTP and rejects invalid or unauthenticated requests', async () => {
    const session = await signIn('member@example.test');
    expect(session.cookie).toContain('session=');
    expect(session.header).toContain('HttpOnly');
    expect(session.header).toContain('Secure');

    await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: 'not-an-email', password })
      .expect(400);
    await request(app.getHttpServer()).get('/kudos').expect(401);
    await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', session.cookie)
      .send({ recipientId: 'lead-1', message: 'hello', unexpected: true })
      .expect(400);
  });

  it('[AC-5] returns newest-first board pages with at most 20 visible kudos', async () => {
    const { cookie } = await signIn('member@example.test');
    const firstPage = await request(app.getHttpServer())
      .get('/kudos?page=1')
      .set('Cookie', cookie)
      .expect(200);
    const secondPage = await request(app.getHttpServer())
      .get('/kudos?page=2')
      .set('Cookie', cookie)
      .expect(200);

    expect(firstPage.body).toHaveLength(20);
    expect(secondPage.body).toHaveLength(1);
    expect(firstPage.body[0].id).toBe('seed-20');
    expect(secondPage.body[0].id).toBe('seed-00');
  });

  it('[AC-3] allows an authenticated member to create kudos through HTTP', async () => {
    const { cookie } = await signIn('member@example.test');
    const created = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'Thank you for your help!' })
      .expect(201);

    createdKudosId = created.body.id as string;
    expect(created.body).toMatchObject({
      authorId: 'member-1',
      recipientId: 'lead-1',
      message: 'Thank you for your help!',
      isHidden: false,
    });
  });

  it('[AC-6] delivers new kudos to connected board event streams without reloading', async () => {
    const { cookie } = await signIn('member@example.test');
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('HTTP server is not listening');

    const abortController = new AbortController();
    const streamResponse = await fetch(`http://127.0.0.1:${address.port}/kudos/events`, {
      headers: { Cookie: cookie },
      signal: abortController.signal,
    });
    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get('content-type')).toContain('text/event-stream');

    const created = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: 'lead-1', message: 'Live board update' })
      .expect(201);
    const reader = streamResponse.body?.getReader();
    if (!reader) throw new Error('SSE response did not provide a readable body');
    try {
      let frame = '';
      const deadline = Date.now() + 2000;
      while (!frame.includes(created.body.id as string) && Date.now() < deadline) {
        const remaining = deadline - Date.now();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const result = await Promise.race([
          reader.read(),
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => reject(new Error('Timed out waiting for board event')), remaining);
          }),
        ]).finally(() => {
          if (timeout) clearTimeout(timeout);
        });
        frame += new TextDecoder().decode(result.value);
        if (result.done) break;
      }
      expect(frame).toContain(created.body.id as string);
      expect(frame).toContain('kudos-added');
    } finally {
      abortController.abort();
      await reader.cancel().catch(() => undefined);
    }
  });

  it('[AC-7] lets an authenticated member add an emoji reaction through HTTP', async () => {
    const { cookie } = await signIn('member@example.test');
    const response = await request(app.getHttpServer())
      .post(`/kudos/${createdKudosId}/reactions`)
      .set('Cookie', cookie)
      .send({ emoji: '🎉' })
      .expect(201);

    expect(response.body).toMatchObject({
      userId: 'member-1',
      kudosId: createdKudosId,
      emoji: '🎉',
    });
  });

  it('[AC-8] rejects member moderation and allows a team lead to hide kudos', async () => {
    const member = await signIn('member@example.test');
    const lead = await signIn('team-lead@example.test');

    await request(app.getHttpServer())
      .post(`/kudos/${createdKudosId}/hide`)
      .set('Cookie', member.cookie)
      .expect(403);

    const hidden = await request(app.getHttpServer())
      .post(`/kudos/${createdKudosId}/hide`)
      .set('Cookie', lead.cookie)
      .expect(201);
    expect(hidden.body).toEqual({ id: createdKudosId, isHidden: true });
  });

  it('[AC-9] removes hidden kudos from board results', async () => {
    const { cookie } = await signIn('member@example.test');
    const board = await request(app.getHttpServer())
      .get('/kudos')
      .set('Cookie', cookie)
      .expect(200);

    expect(board.body).not.toContainEqual(expect.objectContaining({ id: createdKudosId }));
  });
});
