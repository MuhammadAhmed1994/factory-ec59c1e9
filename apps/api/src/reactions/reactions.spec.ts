import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { ReactionsModule } from './reactions.module';

const signedInMember = {
  id: 'member-123',
  email: 'member@example.com',
  name: 'Test Member',
  role: 'MEMBER' as const,
};

describe('ReactionsController', () => {
  let app: INestApplication;
  const createdAt = new Date('2026-06-01T12:00:00.000Z');
  const prismaMock = {
    kudos: {
      findUnique: jest.fn(),
    },
    reaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    prismaMock.kudos.findUnique.mockReset().mockResolvedValue({ id: 'kudos-456' });
    prismaMock.reaction.create.mockReset().mockResolvedValue({
      id: 'reaction-789',
      userId: signedInMember.id,
      kudosId: 'kudos-456',
      emoji: '🎉',
      createdAt,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ReactionsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext): boolean => {
          context.switchToHttp().getRequest().user = signedInMember;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('[AC-7] lets a signed-in member add a reaction and returns the created reaction', async () => {
    const response = await request(app.getHttpServer())
      .post('/kudos/kudos-456/reactions')
      .send({ emoji: '🎉' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 'reaction-789',
      userId: signedInMember.id,
      kudosId: 'kudos-456',
      emoji: '🎉',
      createdAt: createdAt.toISOString(),
    });
    expect(prismaMock.reaction.create).toHaveBeenCalledWith({
      data: { kudosId: 'kudos-456', userId: signedInMember.id, emoji: '🎉' },
      select: {
        id: true,
        userId: true,
        kudosId: true,
        emoji: true,
        createdAt: true,
      },
    });
  });
});
