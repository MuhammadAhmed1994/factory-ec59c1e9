import 'reflect-metadata';
import { AddressInfo } from 'node:net';
import * as http from 'node:http';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    async $connect(): Promise<void> {}
    async $disconnect(): Promise<void> {}
  },
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

const memberPassword = 'member-password-for-api-test';
const leadPassword = 'lead-password-for-api-test';
let users: TestUser[] = [];
let kudosItems: TestKudos[] = [];
let reactions: Array<Record<string, unknown>> = [];
let nextKudosId = 0;
let nextReactionId = 0;

const prismaMock = {
  user: {
    findUnique: async ({ where }: { where: { email?: string; id?: string } }) =>
      users.find((user) => user.email === where.email || user.id === where.id) ?? null,
  },
  kudos: {
    create: async ({ data }: { data: { authorId: string; recipientId: string; message: string } }) => {
      const author = users.find((user) => user.id === data.authorId)!;
      const recipient = users.find((user) => user.id === data.recipientId)!;
      const timestamp = new Date();
      const created: TestKudos = {
        id: `kudos-${++nextKudosId}`,
        ...data,
        isHidden: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        author: { id: author.id, name: author.name },
        recipient: { id: recipient.id, name: recipient.name },
      };
      kudosItems.push(created);
      return created;
    },
    findMany: async ({
      where,
      skip,
      take,
    }: {
      where: { isHidden: boolean };
      skip: number;
      take: number;
    }) => kudosItems.filter((item) => !where.isHidden || !item.isHidden).slice().reverse().slice(skip, skip + take),
    findUnique: async ({ where }: { where: { id: string } }) =>
      kudosItems.find((item) => item.id === where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: { isHidden: boolean } }) => {
      const found = kudosItems.find((item) => item.id === where.id)!;
      found.isHidden = data.isHidden;
      return { id: found.id, isHidden: found.isHidden };
    },
  },
  reaction: {
    create: async ({ data }: { data: { kudosId: string; userId: string; emoji: string } }) => {
      const created = {
        id: `reaction-${++nextReactionId}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reactions.push(created);
      return created;
    },
  },
};

describe('assembled API HTTP e2e', () => {
  let app: INestApplication;
  let memberCookie: string;
  let leadCookie: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'api-e2e-session-signing-secret';
    const [memberHash, leadHash] = await Promise.all([
      bcrypt.hash(memberPassword, 4),
      bcrypt.hash(leadPassword, 4),
    ]);
    users = [
      {
        id: 'member-id',
        email: 'member@example.test',
        name: 'Test Member',
        role: 'MEMBER',
        passwordHash: memberHash,
      },
      {
        id: 'lead-id',
        email: 'lead@example.test',
        name: 'Test Lead',
        role: 'TEAM_LEAD',
        passwordHash: leadHash,
      },
      {
        id: 'recipient-id',
        email: 'recipient@example.test',
        name: 'Test Recipient',
        role: 'MEMBER',
        passwordHash: memberHash,
      },
    ];

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    const memberSession = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: 'member@example.test', password: memberPassword })
      .expect(201);
    const leadSession = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: 'lead@example.test', password: leadPassword })
      .expect(201);
    const memberSetCookie = memberSession.headers['set-cookie'];
    const leadSetCookie = leadSession.headers['set-cookie'];
    memberCookie = (Array.isArray(memberSetCookie) ? memberSetCookie[0] : memberSetCookie).split(';')[0];
    leadCookie = (Array.isArray(leadSetCookie) ? leadSetCookie[0] : leadSetCookie).split(';')[0];
  });

  beforeEach(() => {
    kudosItems = [];
    reactions = [];
    nextKudosId = 0;
    nextReactionId = 0;
  });

  afterAll(async () => {
    await app?.close();
    delete process.env.JWT_SECRET;
  });

  it('signs in over HTTP and permits member posting, reactions, board pagination, and lead moderation', async () => {
    const created = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId: 'recipient-id', message: 'Thanks for your help!' })
      .expect(201);
    expect(created.body).toMatchObject({
      authorId: 'member-id',
      recipientId: 'recipient-id',
      message: 'Thanks for your help!',
    });

    const reaction = await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/reactions`)
      .set('Cookie', memberCookie)
      .send({ emoji: '🎉' })
      .expect(201);
    expect(reaction.body).toMatchObject({ kudosId: created.body.id, userId: 'member-id', emoji: '🎉' });

    for (let index = 0; index < 20; index += 1) {
      await request(app.getHttpServer())
        .post('/kudos')
        .set('Cookie', memberCookie)
        .send({ recipientId: 'recipient-id', message: `Page item ${index}` })
        .expect(201);
    }
    const firstPage = await request(app.getHttpServer())
      .get('/kudos?page=1')
      .set('Cookie', memberCookie)
      .expect(200);
    const secondPage = await request(app.getHttpServer())
      .get('/kudos?page=2')
      .set('Cookie', memberCookie)
      .expect(200);
    expect(firstPage.body).toHaveLength(20);
    expect(secondPage.body).toHaveLength(1);

    await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', memberCookie)
      .expect(403);
    const hidden = await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', leadCookie)
      .expect(201);
    expect(hidden.body).toMatchObject({ id: created.body.id, isHidden: true });
    const visibleBoard = await request(app.getHttpServer())
      .get('/kudos')
      .set('Cookie', memberCookie)
      .expect(200);
    expect(visibleBoard.body.some((item: { id: string }) => item.id === created.body.id)).toBe(false);
  });

  it('rejects unauthenticated requests and invalid DTO input with Nest HTTP errors', async () => {
    await request(app.getHttpServer()).get('/kudos').expect(401);
    await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId: 'recipient-id', message: 'Valid message', unexpected: true })
      .expect(400);
  });

  it('delivers live board additions through the authenticated HTTP event stream', async () => {
    const server = app.getHttpServer() as http.Server;
    const address = server.address() as AddressInfo;
    let streamRequest: http.ClientRequest;
    let receivedEvent = false;
    let resolveEvent!: () => void;
    let rejectEvent!: (error: Error) => void;
    const eventReceived = new Promise<void>((resolve, reject) => {
      resolveEvent = resolve;
      rejectEvent = reject;
    });
    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    const streamReady = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    streamRequest = http.get(
      {
        host: '127.0.0.1',
        port: address.port,
        path: '/kudos/events',
        headers: { Cookie: memberCookie },
      },
      (response) => {
        if (response.statusCode !== 200 || !response.headers['content-type']?.includes('text/event-stream')) {
          rejectReady(new Error(`Unexpected SSE response: ${response.statusCode}`));
          return;
        }
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          body += chunk;
          if (!receivedEvent && body.includes('kudos-added')) {
            receivedEvent = true;
            resolveEvent();
            streamRequest.destroy();
          }
        });
        resolveReady();
      },
    );
    streamRequest.on('error', (error: Error) => {
      if (!receivedEvent) rejectEvent(error);
      rejectReady(error);
    });

    await streamReady;
    expect(streamRequest).toBeDefined();
    await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId: 'recipient-id', message: 'This should appear live.' })
      .expect(201);
    await eventReceived;
  });
});
