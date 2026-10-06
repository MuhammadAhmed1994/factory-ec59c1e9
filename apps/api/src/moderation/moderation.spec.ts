import { createHmac } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationModule } from './moderation.module';

const testSecret = 'moderation-test-secret';

function createSession(role: 'MEMBER' | 'TEAM_LEAD'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      id: `${role.toLowerCase()}-id`,
      email: `${role.toLowerCase()}@example.test`,
      name: role,
      role,
      exp: Math.floor(Date.now() / 1000) + 60,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', testSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('ModerationController', () => {
  let app: INestApplication;
  let prismaMock: { kudos: { updateMany: jest.Mock } };
  let boardEvents: BoardEventsService;

  beforeAll(async () => {
    process.env.JWT_SECRET = testSecret;
    prismaMock = { kudos: { updateMany: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      imports: [ModerationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = module.createNestApplication();
    await app.init();
    boardEvents = module.get(BoardEventsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[AC-8] a team lead can hide kudos and the API marks it hidden', async () => {
    const observedEvents: unknown[] = [];
    const subscription = boardEvents
      .getEvents()
      .subscribe((event) => observedEvents.push(event));
    prismaMock.kudos.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({
      count: 1,
    });

    await request(app.getHttpServer()).post('/kudos/kudos-1/hide').expect(401);
    await request(app.getHttpServer())
      .post('/kudos/kudos-1/hide')
      .set('Cookie', `session=${createSession('MEMBER')}`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/kudos/missing-kudos/hide')
      .set('Cookie', `session=${createSession('TEAM_LEAD')}`)
      .expect(404);

    const response = await request(app.getHttpServer())
      .post('/kudos/kudos-1/hide')
      .set('Cookie', `session=${createSession('TEAM_LEAD')}`)
      .expect(201);

    expect(response.body).toEqual({ id: 'kudos-1', isHidden: true });
    expect(prismaMock.kudos.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'missing-kudos' },
      data: { isHidden: true },
    });
    expect(prismaMock.kudos.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'kudos-1' },
      data: { isHidden: true },
    });
    expect(observedEvents).toEqual([
      {
        type: 'kudos-removed',
        data: { type: 'removed', id: 'kudos-1' },
      },
    ]);
    subscription.unsubscribe();
  });
});
