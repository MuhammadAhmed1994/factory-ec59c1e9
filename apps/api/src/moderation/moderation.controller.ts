import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { ModerationService, HideKudosResult } from './moderation.service';

@Controller('kudos')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post(':id/hide')
  @Roles('TEAM_LEAD')
  async hideKudos(@Param('id') id: string): Promise<HideKudosResult> {
    return this.moderationService.hideKudos(id);
  }
}
