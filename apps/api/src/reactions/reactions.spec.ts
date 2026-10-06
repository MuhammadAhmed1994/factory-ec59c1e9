import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function createSessionToken(secret: string, payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('ReactionsController', () => {
  it('[AC-7] lets a signed-in member add a reaction and returns its details', async () => {
    const previousSecret = process.env.JWT_SECRET;
    const secret = 'reaction-test-secret';
    process.env.JWT_SECRET = secret;
    const createdAt = new Date('2026-06-01T12:00:00.000Z');
    const reaction = {
      id: 'reaction-1',
      userId: 'member-1',
      kudosId: 'kudos-1',
      emoji: '🎉',
      createdAt,
      updatedAt: createdAt,
    };
    const prismaMock = {
      kudos: {
        findUnique: jest.fn().mockResolvedValue({ id: 'kudos-1' }),
      },
      reaction: {
        create: jest.fn().mockResolvedValue(reaction),
      },
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ReactionsController],
      providers: [
        ReactionsService,
        SessionAuthGuard,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    try {
      const session = createSessionToken(secret, {
        id: 'member-1',
        email: 'member@example.test',
        name: 'Member One',
        role: 'MEMBER',
      });
      const response = await request(app.getHttpServer())
        .post('/kudos/kudos-1/reactions')
        .set('Cookie', `session=${session}`)
        .send({ emoji: '🎉' })
        .expect(201);

      expect(response.body).toEqual({
        ...reaction,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      });
      expect(prismaMock.reaction.create).toHaveBeenCalledWith({
        data: { userId: 'member-1', kudosId: 'kudos-1', emoji: '🎉' },
        select: {
          id: true,
          userId: true,
          kudosId: true,
          emoji: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } finally {
      await app.close();
      if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = previousSecret;
      }
    }
  });
});
