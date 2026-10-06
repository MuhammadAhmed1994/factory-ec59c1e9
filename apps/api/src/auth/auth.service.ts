import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

export const PRISMA_SERVICE = 'PRISMA_SERVICE';
export const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export interface SessionIdentity {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'TEAM_LEAD';
}

export interface CreatedSession {
  token: string;
  user: SessionIdentity;
}

interface UserWithPassword extends SessionIdentity {
  passwordHash: string;
}

@Injectable()
export class AuthService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  async createSession(credentials: CreateSessionDto): Promise<CreatedSession> {
    const user = (await this.prisma.user.findUnique({
      where: { email: credentials.email },
    })) as UserWithPassword | null;

    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userIdentity: SessionIdentity = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      token: this.signSession(userIdentity),
      user: userIdentity,
    };
  }

  private signSession(user: SessionIdentity): string {
    const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET or SESSION_SECRET must be configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({ ...user, iat: now, exp: now + SESSION_DURATION_SECONDS });
    const signingInput = `${header}.${payload}`;
    const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
    return `${signingInput}.${signature}`;
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
