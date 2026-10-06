import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../common/auth/session-auth.guard';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionDetails, ReactionsService } from './reactions.service';

@Controller('kudos/:id/reactions')
@UseGuards(SessionAuthGuard)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  create(
    @Param('id') kudosId: string,
    @Body() createReactionDto: CreateReactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReactionDetails> {
    return this.reactionsService.create(kudosId, user.id, createReactionDto);
  }
}
