import {
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { HideKudosResult, ModerationService } from './moderation.service';

export class HideKudosParamsDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

@Controller('kudos')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post(':id/hide')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('TEAM_LEAD')
  hideKudos(@Param() params: HideKudosParamsDto): Promise<HideKudosResult> {
    return this.moderationService.hideKudos(params.id);
  }
}
