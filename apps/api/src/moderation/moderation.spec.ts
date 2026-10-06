import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { BoardEventsService } from '../common/events/board-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationModule } from './moderation.module';

const sessionSecret = 'moderation-spec-session-secret';

function createSession(role: 'MEMBER' | 'TEAM_LEAD'): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsignedToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    id: `${role.toLowerCase()}-id`,
    email: `${role.toLowerCase()}@example.test`,
    name: role,
    role,
  })}`;
  const signature = createHmac('sha256', sessionSecret)
    .update(unsignedToken)
    .digest('base64url');
  return `${unsignedToken}.${signature}`;
}

describe('ModerationController', () => {
  let app: INestApplication | undefined;
  const originalJwtSecret = process.env.JWT_SECRET;
  const prismaMock = {
    kudos: {
      findUnique: jest.fn(
        async (args: { where: { id: string } }): Promise<{ id: string } | null> =>
          args.where.id === 'missing-kudos' ? null : { id: args.where.id },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: { isHidden: boolean };
        }): Promise<{ id: string; isHidden: boolean }> => ({
          id: args.where.id,
          isHidden: args.data.isHidden,
        }),
      ),
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = sessionSecret;
    const moduleRef = await Test.createTestingModule({
      imports: [ModerationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('[AC-8] team lead hides kudos and the API marks it hidden', async () => {
    const boardEvents = app?.get(BoardEventsService);
    if (!app || !boardEvents) {
      throw new Error('Moderation application was not initialized');
    }
    const publishKudosRemoved = jest.spyOn(boardEvents, 'publishKudosRemoved');

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
      .expect(200);

    expect(response.body).toEqual({ id: 'kudos-1', isHidden: true });
    expect(prismaMock.kudos.update).toHaveBeenCalledWith({
      where: { id: 'kudos-1' },
      data: { isHidden: true },
      select: { id: true, isHidden: true },
    });
    expect(publishKudosRemoved).toHaveBeenCalledWith('kudos-1');
  });
});
