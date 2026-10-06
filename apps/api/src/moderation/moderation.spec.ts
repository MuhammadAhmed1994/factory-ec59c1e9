import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationModule } from './moderation.module';

const sessionSecret = 'moderation-test-secret';

function createSession(role: 'MEMBER' | 'TEAM_LEAD'): string {
  const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    id: `test-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.test`,
    name: role,
    role,
    exp: Math.floor(Date.now() / 1000) + 60,
  });
  const signature = createHmac('sha256', sessionSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('ModerationController', () => {
  let app: INestApplication;
  let wasSecretDefined: boolean;
  let previousSecret: string | undefined;
  let isHidden: boolean;

  beforeAll(async () => {
    previousSecret = process.env.JWT_SECRET;
    wasSecretDefined = previousSecret !== undefined;
    process.env.JWT_SECRET = sessionSecret;
    isHidden = false;

    const prismaMock = {
      kudos: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
          where.id === 'kudos-1' ? { id: where.id } : null,
        ),
        update: jest.fn(async ({ data }: { data: { isHidden: boolean } }) => {
          isHidden = data.isHidden;
          return { id: 'kudos-1', isHidden };
        }),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ModerationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (wasSecretDefined) {
      process.env.JWT_SECRET = previousSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  it('[AC-8] team leads can hide kudos and the API marks it hidden', async () => {
    const boardEvents = app.get(BoardEventsService);
    const removedEvent = new Promise<{ type: string; data: { id: string } }>((resolve) => {
      boardEvents.getEvents().subscribe((event) => {
        if (event.type === 'kudos-removed') {
          resolve(event);
        }
      });
    });

    const teamLeadResponse = await request(app.getHttpServer())
      .post('/kudos/kudos-1/hide')
      .set('Cookie', `session=${createSession('TEAM_LEAD')}`);

    expect(teamLeadResponse.status).toBe(201);
    expect(isHidden).toBe(true);
    await expect(removedEvent).resolves.toEqual({
      type: 'kudos-removed',
      data: { type: 'removed', id: 'kudos-1' },
    });

    const memberResponse = await request(app.getHttpServer())
      .post('/kudos/kudos-1/hide')
      .set('Cookie', `session=${createSession('MEMBER')}`);
    expect(memberResponse.status).toBe(403);

    const anonymousResponse = await request(app.getHttpServer()).post('/kudos/kudos-1/hide');
    expect(anonymousResponse.status).toBe(401);

    const missingKudosResponse = await request(app.getHttpServer())
      .post('/kudos/unknown-kudos/hide')
      .set('Cookie', `session=${createSession('TEAM_LEAD')}`);
    expect(missingKudosResponse.status).toBe(404);
  });
});
