import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../app.config';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReactionsModule } from './reactions.module';

describe('POST /kudos/:id/reactions', () => {
  let app: INestApplication;
  const reaction = {
    id: 'reaction-1',
    userId: 'member-1',
    kudosId: 'kudos-1',
    emoji: '🎉',
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
  };
  const prismaMock = {
    kudos: {
      findUnique: jest.fn().mockResolvedValue({ id: 'kudos-1' }),
    },
    reaction: {
      create: jest.fn().mockResolvedValue(reaction),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ReactionsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          context.switchToHttp().getRequest().user = {
            id: 'member-1',
            email: 'member@example.com',
            name: 'Member One',
            role: 'MEMBER',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('[AC-7] returns the created reaction for the signed-in member', async () => {
    const response = await request(app.getHttpServer())
      .post('/kudos/kudos-1/reactions')
      .send({ emoji: '🎉' })
      .expect(201);

    expect(response.body).toEqual({
      id: reaction.id,
      userId: 'member-1',
      kudosId: 'kudos-1',
      emoji: '🎉',
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    });
    expect(prismaMock.reaction.create).toHaveBeenCalledWith({
      data: { userId: 'member-1', kudosId: 'kudos-1', emoji: '🎉' },
    });
  });
});
