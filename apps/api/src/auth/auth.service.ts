import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import {
  AuthenticatedUser,
  AuthenticatedUserRole,
} from '../common/auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

export interface CreatedSession {
  user: AuthenticatedUser;
  token: string;
}

interface SessionJwtPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

const SESSION_DURATION_SECONDS = 60 * 60;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 10);

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(credentials: CreateSessionDto): Promise<CreatedSession> {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
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
      role: user.role as AuthenticatedUserRole,
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
    const now = Math.floor(Date.now() / 1000);
    const payload: SessionJwtPayload = {
      ...user,
      iat: now,
      exp: now + SESSION_DURATION_SECONDS,
    };
    const encodedHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
    return `${signingInput}.${signature}`;
  }
}
