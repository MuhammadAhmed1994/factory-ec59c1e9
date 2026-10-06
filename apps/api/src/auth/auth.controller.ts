import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateSessionDto } from './dto/create-session.dto';
import { AuthService, SESSION_DURATION_SECONDS, SessionIdentity } from './auth.service';

export interface SessionResponse {
  user: SessionIdentity;
}

@Controller('auth/sessions')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async createSession(
    @Body() credentials: CreateSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const session = await this.authService.createSession(credentials);
    response.cookie('session', session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS * 1000,
    });
    return { user: session.user };
  }
}
