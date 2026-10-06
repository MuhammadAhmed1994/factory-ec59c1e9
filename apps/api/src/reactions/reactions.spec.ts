import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { ReactionsModule } from './reactions.module';

describe('ReactionsController', () => {
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
      findUnique: jest.fn(),
    },
    reaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    prismaMock.kudos.findUnique.mockResolvedValue({ id: 'kudos-1' });
    prismaMock.reaction.create.mockResolvedValue(reaction);

    const module: TestingModule = await Test.createTestingModule({
      imports: [ReactionsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: object } } }) => {
          context.switchToHttp().getRequest().user = {
            id: 'member-1',
            email: 'member@example.com',
            name: 'Member',
            role: 'MEMBER',
          };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('[AC-7] signed-in member creates a reaction and receives its details', async () => {
    await request(app.getHttpServer())
      .post('/kudos/kudos-1/reactions')
      .send({ emoji: '🎉' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          ...reaction,
          createdAt: reaction.createdAt.toISOString(),
          updatedAt: reaction.updatedAt.toISOString(),
        });
      });

    expect(prismaMock.reaction.create).toHaveBeenCalledWith({
      data: { kudosId: 'kudos-1', userId: 'member-1', emoji: '🎉' },
    });
  });
});
