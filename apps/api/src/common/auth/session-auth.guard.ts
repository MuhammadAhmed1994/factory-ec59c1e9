import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

export type AuthenticatedUserRole = 'MEMBER' | 'TEAM_LEAD';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: AuthenticatedUserRole;
}

type SessionRequest = Request & { user?: AuthenticatedUser };
type JwtPayload = Record<string, unknown>;

const SESSION_COOKIE_NAME = 'session';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const token = this.readSessionCookie(request);
    const user = token ? this.verifySession(token) : null;

    if (!user) {
      throw new UnauthorizedException('A valid session is required');
    }

    request.user = user;
    return true;
  }

  private readSessionCookie(request: Request): string | null {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return null;

    for (const cookie of cookieHeader.split(';')) {
      const separator = cookie.indexOf('=');
      if (separator < 0 || cookie.slice(0, separator).trim() !== SESSION_COOKIE_NAME) {
        continue;
      }
      try {
        return decodeURIComponent(cookie.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
    return null;
  }

  private verifySession(token: string): AuthenticatedUser | null {
    const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
        alg?: unknown;
      };
      if (header.alg !== 'HS256') return null;

      const expected = createHmac('sha256', secret)
        .update(`${parts[0]}.${parts[1]}`)
        .digest();
      const actual = Buffer.from(parts[2], 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      if (typeof payload.exp === 'number' && payload.exp <= now) return null;
      if (typeof payload.nbf === 'number' && payload.nbf > now) return null;

      const id = typeof payload.id === 'string' ? payload.id : payload.sub;
      if (
        typeof id !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.name !== 'string' ||
        (payload.role !== 'MEMBER' && payload.role !== 'TEAM_LEAD')
      ) {
        return null;
      }

      return {
        id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }
}
