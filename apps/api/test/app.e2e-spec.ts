import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { IncomingMessage, request as httpRequest } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';
import { PrismaService } from '../src/prisma/prisma.service';

type TestUser = {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'TEAM_LEAD';
  passwordHash: string;
};

type TestKudos = {
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

type SseConnection = {
  waitForEvent(type: string): Promise<void>;
  close(): void;
};

function openEventStream(port: number, cookie: string): Promise<SseConnection> {
  return new Promise((resolve, reject) => {
    let received = '';
    const waiters: Array<{ type: string; resolve: () => void }> = [];
    const connection = httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/kudos/events',
        headers: { Cookie: cookie },
      },
      (response: IncomingMessage) => {
        if (response.statusCode !== 200) {
          reject(new Error(`SSE endpoint returned ${response.statusCode}`));
          connection.destroy();
          return;
        }
        response.on('data', (chunk: Buffer | string) => {
          received += chunk.toString();
          for (let index = waiters.length - 1; index >= 0; index -= 1) {
            if (received.includes(`event: ${waiters[index].type}`)) {
              waiters[index].resolve();
              waiters.splice(index, 1);
            }
          }
        });
        response.on('error', () => undefined);
        resolve({
          waitForEvent(type: string): Promise<void> {
            if (received.includes(`event: ${type}`)) return Promise.resolve();
            return new Promise((eventResolve) => waiters.push({ type, resolve: eventResolve }));
          },
          close(): void {
            connection.destroy();
          },
        });
      },
    );
    connection.on('error', reject);
    connection.end();
  });
}

describe('assembled API over HTTP', () => {
  let app: INestApplication;
  let serverPort: number;
  let memberCookie: string;
  let leadCookie: string;
  let member: TestUser;
  let lead: TestUser;
  const users = new Map<string, TestUser>();
  const kudos = new Map<string, TestKudos>();
  const reactions: Array<Record<string, unknown>> = [];
  let nextKudosId = 1;

  const prismaMock = {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
        return [...users.values()].find(
          (user) => user.email === where.email || user.id === where.id,
        ) ?? null;
      },
    },
    kudos: {
      create: async ({ data }: { data: { authorId: string; recipientId: string; message: string } }) => {
        const author = users.get(data.authorId)!;
        const recipient = users.get(data.recipientId)!;
        const now = new Date();
        const created: TestKudos = {
          id: `created-${nextKudosId++}`,
          ...data,
          isHidden: false,
          createdAt: now,
          updatedAt: now,
          author: { id: author.id, name: author.name },
          recipient: { id: recipient.id, name: recipient.name },
        };
        kudos.set(created.id, created);
        return created;
      },
      findMany: async ({ skip, take }: { skip: number; take: number }) => {
        return [...kudos.values()]
          .filter((item) => !item.isHidden)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
          .slice(skip, skip + take);
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const item = kudos.get(where.id);
        return item ? { id: item.id } : null;
      },
      update: async ({ where }: { where: { id: string } }) => {
        const item = kudos.get(where.id)!;
        item.isHidden = true;
        item.updatedAt = new Date();
        return { id: item.id, isHidden: item.isHidden };
      },
    },
    reaction: {
      create: async ({ data }: { data: { userId: string; kudosId: string; emoji: string } }) => {
        const created = {
          id: `reaction-${reactions.length + 1}`,
          ...data,
          createdAt: new Date(),
        };
        reactions.push(created);
        return created;
      },
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'api-e2e-session-secret';
    const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
    member = {
      id: 'member-1',
      email: 'member@example.test',
      name: 'Member One',
      role: 'MEMBER',
      passwordHash,
    };
    lead = {
      id: 'lead-1',
      email: 'lead@example.test',
      name: 'Team Lead',
      role: 'TEAM_LEAD',
      passwordHash,
    };
    users.set(member.id, member);
    users.set(lead.id, lead);

    for (let index = 1; index <= 21; index += 1) {
      const createdAt = new Date(Date.UTC(2026, 0, index));
      const id = `seed-${String(index).padStart(2, '0')}`;
      kudos.set(id, {
        id,
        authorId: member.id,
        recipientId: lead.id,
        message: `Seed kudos ${index}`,
        isHidden: false,
        createdAt,
        updatedAt: createdAt,
        author: { id: member.id, name: member.name },
        recipient: { id: lead.id, name: lead.name },
      });
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock as unknown as PrismaService)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);
    serverPort = (app.getHttpServer().address() as { port: number }).port;

    const memberSession = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: member.email, password: 'correct-horse-battery' })
      .expect(201);
    memberCookie = memberSession.headers['set-cookie'][0].split(';')[0];

    const leadSession = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: lead.email, password: 'correct-horse-battery' })
      .expect(201);
    leadCookie = leadSession.headers['set-cookie'][0].split(';')[0];
  });

  afterAll(async () => {
    await app?.close();
    delete process.env.JWT_SECRET;
  });

  it('signs in members, enforces access, validates requests, paginates the board, and streams live changes', async () => {
    expect(memberCookie).toContain('session=');
    expect(leadCookie).toContain('session=');
    await request(app.getHttpServer()).get('/kudos').expect(401);

    const firstPage = await request(app.getHttpServer())
      .get('/kudos?page=1')
      .set('Cookie', memberCookie)
      .expect(200);
    expect(firstPage.body).toHaveLength(20);
    expect(firstPage.body[0].id).toBe('seed-21');

    const secondPage = await request(app.getHttpServer())
      .get('/kudos?page=2')
      .set('Cookie', memberCookie)
      .expect(200);
    expect(secondPage.body).toHaveLength(1);
    await request(app.getHttpServer())
      .get('/kudos?page=0')
      .set('Cookie', memberCookie)
      .expect(400);

    await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId: lead.id, message: 'Well done', unexpected: true })
      .expect(400);
    await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId: lead.id, message: 'x'.repeat(281) })
      .expect(400);

    const stream = await openEventStream(serverPort, memberCookie);
    const addedEvent = stream.waitForEvent('kudos-added');
    const created = await request(app.getHttpServer())
      .post('/kudos')
      .set('Cookie', memberCookie)
      .send({ recipientId: lead.id, message: 'Thank you for the support!' })
      .expect(201);
    expect(created.body.message).toBe('Thank you for the support!');
    expect(created.body.author.id).toBe(member.id);
    await addedEvent;

    const reaction = await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/reactions`)
      .set('Cookie', memberCookie)
      .send({ emoji: '🎉' })
      .expect(201);
    expect(reaction.body.emoji).toBe('🎉');

    const forbidden = await request(app.getHttpServer())
      .post('/kudos/seed-01/hide')
      .set('Cookie', memberCookie)
      .expect(403);
    expect(forbidden.body.statusCode).toBe(403);

    const removedEvent = stream.waitForEvent('kudos-removed');
    await request(app.getHttpServer())
      .post(`/kudos/${created.body.id}/hide`)
      .set('Cookie', leadCookie)
      .expect(200)
      .expect({ id: created.body.id, isHidden: true });
    await removedEvent;
    stream.close();

    const visibleBoard = await request(app.getHttpServer())
      .get('/kudos')
      .set('Cookie', memberCookie)
      .expect(200);
    expect(visibleBoard.body.some((item: TestKudos) => item.id === created.body.id)).toBe(false);
  });
});
