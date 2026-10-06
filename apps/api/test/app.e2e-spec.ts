import { INestApplication } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import * as http from 'node:http';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/app.config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const memberPassword = 'member-password-for-e2e';
const leadPassword = 'lead-password-for-e2e';
const users = [
  {
    id: 'member-e2e',
    email: 'member@example.test',
    name: 'Example Member',
    role: 'MEMBER',
    passwordHash: bcrypt.hashSync(memberPassword, 4),
  },
  {
    id: 'lead-e2e',
    email: 'lead@example.test',
    name: 'Example Lead',
    role: 'TEAM_LEAD',
    passwordHash: bcrypt.hashSync(leadPassword, 4),
  },
];

type TestKudos = {
  id: string;
  authorId: string;
  recipientId: string;
  message: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const prisma = {
  user: { findUnique: jest.fn() },
  kudos: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  reaction: { create: jest.fn() },
};

describe('assembled API e2e', () => {
  let app: INestApplication;
  let kudos: TestKudos[];
  let nextId: number;

  async function signIn(user: (typeof users)[number], password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: user.email, password })
      .expect(201);
    const cookieHeader = response.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    return cookie.split(';')[0];
  }

  function resetPersistence(): void {
    kudos = [];
    nextId = 1;
    prisma.user.findUnique.mockReset().mockImplementation(async ({ where }: any) =>
      users.find((user) => user.email === where.email) ?? null,
    );
    prisma.kudos.create.mockReset().mockImplementation(async ({ data }: any) => {
      const now = new Date();
      const record: TestKudos = {
        id: `kudos-${nextId++}`,
        ...data,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      };
      kudos.push(record);
      return record;
    });
    prisma.kudos.findMany.mockReset().mockImplementation(async ({ skip, take, where }: any) =>
      kudos
        .filter((item) => !where?.isHidden || !item.isHidden)
        .slice(skip, skip + take),
    );
    prisma.kudos.findUnique.mockReset().mockImplementation(async ({ where }: any) =>
      kudos.find((item) => item.id === where.id) ?? null,
    );
    prisma.kudos.update.mockReset().mockImplementation(async ({ where, data, select }: any) => {
      const record = kudos.find((item) => item.id === where.id);
      if (!record) throw new Error('Unexpected missing test kudos');
      Object.assign(record, data, { updatedAt: new Date() });
      return select ? { id: record.id, isHidden: record.isHidden } : record;
    });
    prisma.reaction.create.mockReset().mockImplementation(async ({ data }: any) => ({
      id: 'reaction-e2e',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async function receiveBoardEvent(
    cookie: string,
    publish: () => Promise<unknown>,
  ): Promise<string> {
    const address = app.getHttpServer().address() as AddressInfo;
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let eventData = '';
      const stream = http.request(
        {
          host: '127.0.0.1',
          port: address.port,
          path: '/kudos/events',
          method: 'GET',
          headers: { Cookie: cookie },
        },
        (response) => {
          response.on('data', (chunk: Buffer) => {
            eventData += chunk.toString('utf8');
            if (!settled && eventData.includes('data:')) {
              settled = true;
              resolve(eventData);
              stream.destroy();
            }
          });
          void publish().catch((error: unknown) => {
            if (!settled) {
              settled = true;
              reject(error);
              stream.destroy();
            }
          });
        },
      );
      stream.on('error', (error: Error) => {
        if (!settled) reject(error);
      });
      stream.end();
    });
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'assembled-api-test-signing-secret';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  beforeEach(() => resetPersistence());

  it('[AC-2] signs in a member through the assembled HTTP API and issues a session cookie', async () => {
    const cookie = await signIn(users[0], memberPassword);
    expect(cookie).toMatch(/^session=/);
  });

  it('[AC-3] lets a signed-in member create kudos over HTTP', async () => {
    const cookie = await signIn(users[0], memberPassword);
    const response = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: users[1].id, message: 'Thanks for your help!' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'kudos-1',
      authorId: users[0].id,
      recipientId: users[1].id,
      message: 'Thanks for your help!',
      isHidden: false,
    });
  });

  it('[AC-5] returns the requested page of visible kudos through HTTP', async () => {
    const cookie = await signIn(users[0], memberPassword);
    kudos = Array.from({ length: 21 }, (_, index) => ({
      id: `kudos-${index + 1}`,
      authorId: users[0].id,
      recipientId: users[1].id,
      message: `Message ${index + 1}`,
      isHidden: false,
      createdAt: new Date(Date.now() - index * 1000),
      updatedAt: new Date(),
    }));

    const response = await request(app.getHttpServer())
      .get('/kudos?page=2')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toMatchObject({ page: 2, pageSize: 20 });
    expect(response.body.kudos).toHaveLength(1);
    expect(response.body.kudos[0].id).toBe('kudos-21');
    expect(prisma.kudos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it('[AC-6] delivers a newly posted kudos event to a connected HTTP event stream', async () => {
    const cookie = await signIn(users[0], memberPassword);
    const event = await receiveBoardEvent(cookie, async () => {
      await request(app.getHttpServer())
        .post('/kudos')
        .set('Cookie', cookie)
        .send({ recipientId: users[1].id, message: 'Live update' })
        .expect(201);
    });

    expect(event).toContain('kudos-added');
    expect(event).toContain('kudos-1');
  });

  it('[AC-7] lets an authenticated member add a reaction over HTTP', async () => {
    const cookie = await signIn(users[0], memberPassword);
    kudos = [{
      id: 'kudos-existing',
      authorId: users[1].id,
      recipientId: users[0].id,
      message: 'Well done',
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }];

    const response = await request(app.getHttpServer())
      .post('/kudos/kudos-existing/reactions')
      .set('Cookie', cookie)
      .send({ emoji: '🎉' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'reaction-e2e',
      kudosId: 'kudos-existing',
      userId: users[0].id,
      emoji: '🎉',
    });
  });

  it('[AC-8] authorizes a team lead to hide kudos over HTTP', async () => {
    const cookie = await signIn(users[1], leadPassword);
    kudos = [{
      id: 'kudos-to-hide',
      authorId: users[0].id,
      recipientId: users[1].id,
      message: 'Inappropriate',
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }];

    const response = await request(app.getHttpServer())
      .post('/kudos/kudos-to-hide/hide')
      .set('Cookie', cookie)
      .expect(201);

    expect(response.body).toEqual({ id: 'kudos-to-hide', isHidden: true });
    expect(kudos[0].isHidden).toBe(true);
  });

  it('[AC-9] broadcasts a hidden kudos removal to a connected HTTP event stream', async () => {
    const leadCookie = await signIn(users[1], leadPassword);
    const memberCookie = await signIn(users[0], memberPassword);
    kudos = [{
      id: 'kudos-hidden-live',
      authorId: users[0].id,
      recipientId: users[1].id,
      message: 'Remove from board',
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }];

    const event = await receiveBoardEvent(memberCookie, async () => {
      await request(app.getHttpServer())
        .post('/kudos/kudos-hidden-live/hide')
        .set('Cookie', leadCookie)
        .expect(201);
    });

    expect(event).toContain('kudos-removed');
    expect(event).toContain('kudos-hidden-live');
  });

  it('[AC-2] rejects invalid sign-in payloads with Nest HTTP 400 validation responses', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: 'not-an-email' })
      .expect(400);
    expect(response.body.message).toEqual(expect.arrayContaining([
      expect.any(String),
    ]));
  });

  it('[AC-3] rejects malformed kudos payloads with Nest HTTP 400 validation responses', async () => {
    const cookie = await signIn(users[0], memberPassword);
    await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', cookie)
      .send({ recipientId: users[1].id, message: 'x'.repeat(281) })
      .expect(400);
  });

  it('[AC-8] rejects anonymous and non-lead access to protected operations', async () => {
    await request(app.getHttpServer())
      .post('/kudos')
      .send({ recipientId: users[1].id, message: 'No session' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/kudos/kudos-any/hide')
      .expect(401);

    const memberCookie = await signIn(users[0], memberPassword);
    await request(app.getHttpServer())
      .post('/kudos/kudos-any/hide')
      .set('Cookie', memberCookie)
      .expect(403);
  });
});
