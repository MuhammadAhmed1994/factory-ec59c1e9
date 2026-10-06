import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService, CreateSessionResult } from './auth.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Controller('auth/sessions')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async createSession(
    @Body() credentials: CreateSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: CreateSessionResult['user'] }> {
    const session = await this.authService.createSession(credentials);

    response.cookie('session', session.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: session.maxAgeMilliseconds,
    });

    return { user: session.user };
  }
}
