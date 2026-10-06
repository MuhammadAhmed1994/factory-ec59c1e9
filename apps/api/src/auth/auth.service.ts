import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUserRole } from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

export interface SessionIdentity {
  id: string;
  email: string;
  name: string;
  role: AuthenticatedUserRole;
}

export interface CreatedSession {
  user: SessionIdentity;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(credentials: CreateSessionDto): Promise<CreatedSession> {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    const passwordMatches = user
      ? await bcrypt.compare(credentials.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('Session signing is not configured');
    }

    const identity: SessionIdentity = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthenticatedUserRole,
    };
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({ ...identity, iat: issuedAt, exp: issuedAt + 3600 });
    const unsignedToken = `${header}.${payload}`;
    const signature = createHmac('sha256', secret).update(unsignedToken).digest('base64url');

    return { user: identity, token: `${unsignedToken}.${signature}` };
  }

  private encode(value: Record<string, string | number>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
