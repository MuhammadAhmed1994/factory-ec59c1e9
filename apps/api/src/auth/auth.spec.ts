import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { configureApp } from '../app.config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from './auth.module';

const credentials = {
  email: 'member@example.test',
  password: 'correct-horse-battery-staple',
};
const provisionedUser = {
  id: 'member-id',
  email: credentials.email,
  name: 'Member Example',
  role: 'MEMBER',
  passwordHash: bcrypt.hashSync(credentials.password, 4),
};

describe('Auth sessions', () => {
  let app: INestApplication;
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-session-signing-secret';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  beforeEach(() => {
    prisma.user.findUnique.mockReset().mockResolvedValue(provisionedUser);
  });

  it('[AC-2] valid credentials establish an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send(credentials)
      .expect(201);

    expect(response.body).toEqual({
      user: {
        id: provisionedUser.id,
        email: provisionedUser.email,
        name: provisionedUser.name,
        role: provisionedUser.role,
      },
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^session=.*; HttpOnly; Secure; SameSite=Lax; Path=\//),
      ]),
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: credentials.email },
    });
  });
});
