import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser, SessionAuthGuard } from '../common/auth/session-auth.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionDetails, ReactionsService } from './reactions.service';

@Controller('kudos/:id/reactions')
@UseGuards(SessionAuthGuard)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('id') kudosId: string,
    @Body() dto: CreateReactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReactionDetails> {
    return this.reactionsService.createReaction(kudosId, user.id, dto.emoji);
  }
}
