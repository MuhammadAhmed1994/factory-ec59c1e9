import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AuthModule } from './auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { configureApp } from '../app.config';

const signingSecret = 'test-session-signing-secret';
const provisionedUser = {
  id: 'member-1',
  email: 'member@example.test',
  name: 'Taylor Member',
  role: 'MEMBER',
  passwordHash: bcrypt.hashSync('correct-password', 4),
};

const prismaMock = {
  user: {
    findUnique: jest.fn<Promise<typeof provisionedUser>, []>(),
  },
};

describe('Auth sessions', () => {
  let app: INestApplication;
  let previousSecret: string | undefined;

  beforeAll(async () => {
    previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = signingSecret;
    prismaMock.user.findUnique.mockResolvedValue(provisionedUser);

    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  it('[AC-2] valid credentials establish an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: provisionedUser.email, password: 'correct-password' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      user: {
        id: provisionedUser.id,
        email: provisionedUser.email,
        name: provisionedUser.name,
        role: provisionedUser.role,
      },
    });

    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toMatch(/^session=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
  });
});
