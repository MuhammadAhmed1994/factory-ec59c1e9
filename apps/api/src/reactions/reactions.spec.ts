import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReactionsModule } from './reactions.module';

describe('POST /kudos/:id/reactions', () => {
  it('[AC-7] lets a signed-in member add a reaction and returns the created reaction', async () => {
    const createdAt = new Date('2026-06-01T12:00:00.000Z');
    const createdReaction = {
      id: 'reaction-1',
      userId: 'member-1',
      kudosId: 'kudos-1',
      emoji: '🎉',
      createdAt,
    };
    const prismaMock = {
      kudos: {
        findUnique: jest.fn(async () => ({ id: 'kudos-1' })),
      },
      reaction: {
        create: jest.fn(async () => createdReaction),
      },
    };
    const authGuard = {
      canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }): boolean => {
        context.switchToHttp().getRequest().user = {
          id: 'member-1',
          email: 'member@example.com',
          name: 'Member',
          role: 'MEMBER',
        };
        return true;
      },
    };

    const testingModule = await Test.createTestingModule({
      imports: [ReactionsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(SessionAuthGuard)
      .useValue(authGuard)
      .compile();
    const app: INestApplication = testingModule.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    try {
      const response = await request(app.getHttpServer())
        .post('/kudos/kudos-1/reactions')
        .send({ emoji: '🎉' })
        .expect(201);

      expect(response.body).toEqual({
        id: 'reaction-1',
        userId: 'member-1',
        kudosId: 'kudos-1',
        emoji: '🎉',
        createdAt: createdAt.toISOString(),
      });
      expect(prismaMock.reaction.create).toHaveBeenCalledWith({
        data: { userId: 'member-1', kudosId: 'kudos-1', emoji: '🎉' },
        select: { id: true, userId: true, kudosId: true, emoji: true, createdAt: true },
      });
    } finally {
      await app.close();
    }
  });
});
