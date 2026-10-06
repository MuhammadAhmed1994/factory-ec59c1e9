import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('POST /auth/sessions', () => {
  let app: INestApplication;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-session-signing-secret';
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const user = {
      id: 'member-1',
      email: 'member@example.test',
      name: 'Example Member',
      role: 'MEMBER' as const,
      passwordHash,
    };
    const prisma = {
      user: {
        findUnique: async () => user,
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('[AC-2] establishes an authenticated session for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: 'member@example.test', password: 'correct-password' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      authenticated: true,
      session: { expiresAt: expect.any(String) },
      user: {
        id: 'member-1',
        email: 'member@example.test',
        name: 'Example Member',
        role: 'MEMBER',
      },
    });
    const cookieHeader = response.headers['set-cookie'];
    const sessionCookie = Array.isArray(cookieHeader)
      ? cookieHeader.find((cookie) => cookie.startsWith('session=')) ?? ''
      : cookieHeader ?? '';
    expect(sessionCookie).toContain('session=');
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Secure');
  });
});
