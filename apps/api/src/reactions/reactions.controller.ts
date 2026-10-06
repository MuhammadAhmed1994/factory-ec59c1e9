import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionDetails, ReactionsService } from './reactions.service';

@Controller('kudos')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post(':id/reactions')
  @UseGuards(SessionAuthGuard)
  createReaction(
    @Param('id') kudosId: string,
    @Body() input: CreateReactionDto,
    @CurrentUser('id') userId: string,
  ): Promise<ReactionDetails> {
    return this.reactionsService.createReaction(kudosId, userId, input);
  }
}
