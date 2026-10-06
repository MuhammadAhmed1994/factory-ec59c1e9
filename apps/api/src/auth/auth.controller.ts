import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedUser } from '../common/auth/session-auth.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { AuthService } from './auth.service';

export interface SessionResponse {
  user: AuthenticatedUser;
}

const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60;

@Controller('auth/sessions')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async createSession(
    @Body() credentials: CreateSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const session = await this.authService.createSession(credentials);
    response.setHeader(
      'Set-Cookie',
      `session=${encodeURIComponent(session.token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`,
    );
    return { user: session.user };
  }
}
