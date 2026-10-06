import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreateSessionDto } from './dto/create-session.dto';
import { AuthService, CreatedSession } from './auth.service';

export interface SessionResponse {
  user: CreatedSession['user'];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sessions')
  async createSession(
    @Body() credentials: CreateSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const session: CreatedSession = await this.authService.createSession(credentials);
    response.setHeader(
      'Set-Cookie',
      `session=${encodeURIComponent(session.token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`,
    );
    return { user: session.user };
  }
}
