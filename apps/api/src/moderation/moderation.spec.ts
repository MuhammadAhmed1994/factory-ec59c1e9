import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { BoardEventsService } from '../common/events/board-events.service';
import { ModerationModule } from './moderation.module';
import { PrismaService } from '../prisma/prisma.service';

const sessionSecret = 'moderation-test-secret';
const prismaMock = {
  kudos: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
const boardEventsMock = {
  publishKudosRemoved: jest.fn(),
};

function sessionCookie(role: 'MEMBER' | 'TEAM_LEAD'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      id: 'user-1',
      email: 'lead@example.com',
      name: 'Team Lead',
      role,
      exp: Math.floor(Date.now() / 1000) + 60,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', sessionSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `session=${header}.${payload}.${signature}`;
}

describe('ModerationController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = sessionSecret;
    const moduleRef = await Test.createTestingModule({
      imports: [ModerationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(BoardEventsService)
      .useValue(boardEventsMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  beforeEach(() => {
    prismaMock.kudos.findUnique.mockReset();
    prismaMock.kudos.update.mockReset();
    boardEventsMock.publishKudosRemoved.mockReset();
    prismaMock.kudos.findUnique.mockResolvedValue({ id: 'kudos-1' });
    prismaMock.kudos.update.mockResolvedValue({ id: 'kudos-1', isHidden: true });
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  it('[AC-8] allows a team lead to hide kudos and marks it hidden', async () => {
    const response = await request(app.getHttpServer())
      .post('/kudos/kudos-1/hide')
      .set('Cookie', sessionCookie('TEAM_LEAD'))
      .expect(201);

    expect(response.body).toEqual({ id: 'kudos-1', isHidden: true });
    expect(prismaMock.kudos.update).toHaveBeenCalledWith({
      where: { id: 'kudos-1' },
      data: { isHidden: true },
      select: { id: true, isHidden: true },
    });
    expect(boardEventsMock.publishKudosRemoved).toHaveBeenCalledWith('kudos-1');
  });

  it('rejects requests without a session', async () => {
    await request(app.getHttpServer()).post('/kudos/kudos-1/hide').expect(401);
    expect(prismaMock.kudos.update).not.toHaveBeenCalled();
  });

  it('forbids a signed-in member from hiding kudos', async () => {
    await request(app.getHttpServer())
      .post('/kudos/kudos-1/hide')
      .set('Cookie', sessionCookie('MEMBER'))
      .expect(403);
    expect(prismaMock.kudos.update).not.toHaveBeenCalled();
  });

  it('returns not found when the kudos does not exist', async () => {
    prismaMock.kudos.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/kudos/missing-kudos/hide')
      .set('Cookie', sessionCookie('TEAM_LEAD'))
      .expect(404);
    expect(prismaMock.kudos.update).not.toHaveBeenCalled();
    expect(boardEventsMock.publishKudosRemoved).not.toHaveBeenCalled();
  });
});
