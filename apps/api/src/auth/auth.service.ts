import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

export interface AuthenticatedSessionResponse {
  user: AuthenticatedUser;
}

export interface SessionAuthenticationResult extends AuthenticatedSessionResponse {
  token: string;
}

const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;
const DUMMY_PASSWORD_HASH = '$2b$10$N9qo8uLOickIf2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(credentials: CreateSessionDto): Promise<SessionAuthenticationResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
    });
    const passwordMatches = await bcrypt.compare(
      credentials.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('Session signing secret is not configured');
    }

    return {
      user: authenticatedUser,
      token: this.signSession(authenticatedUser, secret),
    };
  }

  private signSession(user: AuthenticatedUser, secret: string): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = this.encodeBase64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encodeBase64Url({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: issuedAt,
      exp: issuedAt + SESSION_LIFETIME_SECONDS,
    });
    const signingInput = `${header}.${payload}`;
    const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
    return `${signingInput}.${signature}`;
  }

  private encodeBase64Url(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
