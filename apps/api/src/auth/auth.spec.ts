import { ExecutionContext } from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const originalJwtSecret = process.env.JWT_SECRET;
const originalSessionSecret = process.env.SESSION_SECRET;

afterEach(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSessionSecret;
});

describe('Auth sessions', () => {
  it('[AC-2] valid credentials establish an authenticated session', async () => {
    process.env.JWT_SECRET = 'test-session-signing-secret';
    const password = 'valid-password';
    const passwordHash = await bcrypt.hash(password, 4);
    const user = {
      id: 'member-1',
      email: 'member@example.com',
      name: 'Team Member',
      role: 'MEMBER' as const,
      passwordHash,
    };
    const prisma = {
      user: { findUnique: jest.fn(async () => user) },
    } as unknown as PrismaService;
    const authService = new AuthService(prisma);
    const controller = new AuthController(authService);
    let cookieHeader = '';
    const response = {
      setHeader: jest.fn((_name: string, value: string) => {
        cookieHeader = value;
      }),
    } as unknown as Response;

    const result = await controller.createSession(
      { email: user.email, password },
      response,
    );

    expect(result).toEqual({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    expect(response.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringMatching(/^session=.*; HttpOnly; Secure; SameSite=Lax; Path=\//),
    );

    const request = {
      headers: { cookie: cookieHeader.split(';')[0] },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const guard = new SessionAuthGuard();

    expect(guard.canActivate(context)).toBe(true);
    expect(request).toHaveProperty('user', result.user);
  });
});
