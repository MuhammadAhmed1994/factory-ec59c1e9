import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthenticatedUser, SessionAuthGuard } from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReactionsModule } from './reactions.module';

describe('ReactionsController', () => {
  it('[AC-7] adds a reaction for the signed-in member and returns its details', async () => {
    const signedInMember: AuthenticatedUser = {
      id: 'member-1',
      email: 'member@example.com',
      name: 'Member One',
      role: 'MEMBER',
    };
    const createdReaction = {
      id: 'reaction-1',
      userId: signedInMember.id,
      kudosId: 'kudos-1',
      emoji: '🎉',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    };
    const prismaMock = {
      kudos: {
        findUnique: async () => ({ id: 'kudos-1' }),
      },
      reaction: {
        create: async ({ data }: { data: Record<string, string> }) => ({
          ...createdReaction,
          ...data,
        }),
      },
    };

    const testingModule = await Test.createTestingModule({
      imports: [ReactionsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate(context: { switchToHttp(): { getRequest(): { user?: AuthenticatedUser } } }): boolean {
          context.switchToHttp().getRequest().user = signedInMember;
          return true;
        },
      })
      .compile();

    const app: INestApplication = testingModule.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    try {
      await request(app.getHttpServer())
        .post('/kudos/kudos-1/reactions')
        .send({ emoji: '🎉' })
        .expect(201)
        .expect((response) => {
          expect(response.body).toEqual({
            ...createdReaction,
            createdAt: createdReaction.createdAt.toISOString(),
            updatedAt: createdReaction.updatedAt.toISOString(),
          });
        });
    } finally {
      await app.close();
    }
  });
});
