import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'TEAM_LEAD';
}

export interface CreateSessionResult {
  token: string;
  expiresAt: string;
  user: SessionUser;
}

const SESSION_LIFETIME_SECONDS = 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(credentials: CreateSessionDto): Promise<CreateSessionResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email.toLowerCase() },
    });

    const validPassword = user
      ? await bcrypt.compare(credentials.password, user.passwordHash)
      : false;

    if (!user || !validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const now = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = now + SESSION_LIFETIME_SECONDS;
    const token = this.signSession(sessionUser, now, expiresAtSeconds);

    return {
      token,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
      user: sessionUser,
    };
  }

  private signSession(user: SessionUser, issuedAt: number, expiresAt: number): string {
    const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('Session signing is not configured');
    }

    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: issuedAt,
      exp: expiresAt,
    });
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
