import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreateSessionDto } from './dto/create-session.dto';
import { AuthService, SessionUser } from './auth.service';

export interface CreateSessionResponse {
  authenticated: true;
  session: {
    expiresAt: string;
  };
  user: SessionUser;
}

const SESSION_COOKIE_NAME = 'session';
const SESSION_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

@Controller('auth/sessions')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async createSession(
    @Body() credentials: CreateSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CreateSessionResponse> {
    const result = await this.authService.createSession(credentials);
    response.cookie(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE,
    });

    return {
      authenticated: true,
      session: { expiresAt: result.expiresAt },
      user: result.user,
    };
  }
}
