import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from './auth.module';

const user = {
  id: 'user-123',
  email: 'member@example.test',
  name: 'A Member',
  role: 'MEMBER' as const,
  passwordHash: '',
};

const prismaMock = {
  user: {
    findUnique: jest.fn<Promise<typeof user>, []>(),
  },
};

describe('[AC-2] POST /auth/sessions authenticates provisioned users', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-session-secret';
    user.passwordHash = await bcrypt.hash('correct-password', 4);
    prismaMock.user.findUnique.mockResolvedValue(user);

    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  it('[AC-2] returns the user identity and establishes a secure authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sessions')
      .send({ email: user.email, password: 'correct-password' })
      .expect(201);

    expect(response.body).toEqual({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    const cookie = response.headers['set-cookie'] as unknown as string[];
    expect(cookie).toHaveLength(1);
    expect(cookie[0]).toContain('session=');
    expect(cookie[0]).toContain('HttpOnly');
    expect(cookie[0]).toContain('Secure');

    const token = cookie[0].match(/session=([^;]+)/)?.[1];
    expect(token).toBeDefined();
    const payload = JSON.parse(Buffer.from(token!.split('.')[1], 'base64url').toString('utf8')) as {
      sub: string;
      email: string;
      name: string;
      role: string;
      exp: number;
    };
    expect(payload).toMatchObject({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
