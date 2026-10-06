import { Body, Controller, Get, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../common/auth/session-auth.guard';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { BoardEvent, BoardEventsService } from '../common/events/board-events.service';
import { CreateKudosDto, ListKudosQueryDto } from './dto/create-kudos.dto';
import { KudosDetails, KudosService } from './kudos.service';

@Controller('kudos')
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(
    private readonly kudosService: KudosService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateKudosDto,
  ): Promise<KudosDetails> {
    return this.kudosService.createKudos(user.id, dto);
  }

  @Get()
  list(@Query() query: ListKudosQueryDto): Promise<KudosDetails[]> {
    return this.kudosService.listKudos(query.page);
  }

  @Sse('events')
  events(): Observable<BoardEvent> {
    return this.boardEvents.getEvents();
  }
}
