import { createHmac } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ModerationModule } from './moderation.module';
import { PrismaService } from '../prisma/prisma.service';

const sessionSecret = 'moderation-test-session-secret';

function createTeamLeadSession(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      id: 'lead-1',
      email: 'lead@example.com',
      name: 'Team Lead',
      role: 'TEAM_LEAD',
      exp: Math.floor(Date.now() / 1000) + 300,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', sessionSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('ModerationController', () => {
  let app: INestApplication;
  const update = jest.fn().mockResolvedValue({ id: 'kudos-1', isHidden: true } as never);
  const findUnique = jest.fn().mockResolvedValue({ id: 'kudos-1' } as never);
  const prismaMock = {
    kudos: { findUnique, update },
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
    await app.close();
    delete process.env.JWT_SECRET;
  });

  it('[AC-8] allows a team lead to hide kudos and marks it hidden', async () => {
    const response = await request(app.getHttpServer())
      .post('/kudos/kudos-1/hide')
      .set('Cookie', `session=${createTeamLeadSession()}`)
      .expect(201);

    expect(response.body).toEqual({ id: 'kudos-1', isHidden: true });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'kudos-1' },
      select: { id: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'kudos-1' },
      data: { isHidden: true },
      select: { id: true, isHidden: true },
    });
  });
});
