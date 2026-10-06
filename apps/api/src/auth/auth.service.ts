import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

export interface SessionIdentity {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'TEAM_LEAD';
}

export interface CreateSessionResult {
  sessionToken: string;
  maxAgeMilliseconds: number;
  user: SessionIdentity;
}

interface SessionJwtPayload extends SessionIdentity {
  sub: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly sessionDurationSeconds = 8 * 60 * 60;

  constructor(private readonly prisma: PrismaService) {}

  async createSession(credentials: CreateSessionDto): Promise<CreateSessionResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const identity: SessionIdentity = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const now = Math.floor(Date.now() / 1000);
    const payload: SessionJwtPayload = {
      ...identity,
      sub: user.id,
      iat: now,
      exp: now + this.sessionDurationSeconds,
    };
    const sessionToken = this.signSession(payload);

    return {
      sessionToken,
      maxAgeMilliseconds: this.sessionDurationSeconds * 1000,
      user: identity,
    };
  }

  private signSession(payload: SessionJwtPayload): string {
    const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('Session signing secret is not configured');
    }

    const header = this.encodeBase64Url({ alg: 'HS256', typ: 'JWT' });
    const encodedPayload = this.encodeBase64Url(payload);
    const content = `${header}.${encodedPayload}`;
    const signature = createHmac('sha256', secret).update(content).digest('base64url');
    return `${content}.${signature}`;
  }

  private encodeBase64Url(value: object): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  }
}
