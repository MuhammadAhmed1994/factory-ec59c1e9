import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService, PRISMA_SERVICE } from './auth.service';

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'TEAM_LEAD';
  passwordHash: string;
}

describe('[AC-2] POST /auth/sessions establishes an authenticated session', () => {
  let app: INestApplication;
  let testUser: TestUser;
  const findUnique = jest.fn<Promise<TestUser | null>, [args: any]>();

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-session-secret';
    testUser = {
      id: 'member-1',
      email: 'member@example.com',
      name: 'Team Member',
      role: 'MEMBER',
      passwordHash: await bcrypt.hash('correct-password', 4),
    };
    findUnique.mockResolvedValue(testUser);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: PRISMA_SERVICE, useValue: { user: { findUnique } } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  it('[AC-2] returns the member identity and establishes a secure HttpOnly session cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: 'member@example.com', password: 'correct-password' })
      .expect(201);

    expect(response.body).toEqual({
      user: {
        id: 'member-1',
        email: 'member@example.com',
        name: 'Team Member',
        role: 'MEMBER',
      },
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^session=.*; Path=\/; Expires=.*; HttpOnly; Secure; SameSite=Lax$/),
      ]),
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'member@example.com' } });
  });
});
