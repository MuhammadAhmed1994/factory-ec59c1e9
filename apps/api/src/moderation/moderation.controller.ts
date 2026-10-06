import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { HiddenKudosResult, ModerationService } from './moderation.service';

@Controller('kudos')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post(':id/hide')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('TEAM_LEAD')
  hideKudos(@Param('id') id: string): Promise<HiddenKudosResult> {
    return this.moderationService.hideKudos(id);
  }
}
