import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { ModerationService } from './moderation.service';

@Controller('kudos')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post(':id/hide')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('TEAM_LEAD')
  async hideKudos(@Param('id') id: string): Promise<void> {
    await this.moderationService.hideKudos(id);
  }
}
