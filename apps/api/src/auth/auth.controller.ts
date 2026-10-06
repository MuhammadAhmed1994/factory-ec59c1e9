import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreateSessionDto } from './dto/create-session.dto';
import { AuthService, AuthenticatedSessionResponse } from './auth.service';

const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

@Controller('auth/sessions')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async createSession(
    @Body() credentials: CreateSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedSessionResponse> {
    const session = await this.authService.createSession(credentials);
    response.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS,
    });
    return { user: session.user };
  }
}
