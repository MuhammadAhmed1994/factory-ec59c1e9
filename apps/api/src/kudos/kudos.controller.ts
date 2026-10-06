import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../common/auth/session-auth.guard';
import { BoardEvent, BoardEventsService } from '../common/events/board-events.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosRecord, KudosService } from './kudos.service';

export class ListKudosQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;
}

@Controller('kudos')
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(
    private readonly kudosService: KudosService,
    private readonly boardEvents: BoardEventsService,
  ) {}

  @Post()
  create(
    @Body() input: CreateKudosDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KudosRecord> {
    return this.kudosService.create(user.id, input);
  }

  @Get()
  list(@Query() query: ListKudosQueryDto): Promise<KudosRecord[]> {
    return this.kudosService.listVisible(query.page);
  }

  @Sse('events')
  events(): Observable<BoardEvent> {
    return this.boardEvents.getEvents();
  }
}
