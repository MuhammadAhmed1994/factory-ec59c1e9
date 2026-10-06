import { Body, Controller, Get, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../common/auth/session-auth.guard';
import { BoardEvent } from '../common/events/board-events.service';
import { CreateKudosDto, KudosPageQueryDto } from './dto/create-kudos.dto';
import { KudosPage, KudosRecord, KudosService } from './kudos.service';

@Controller('kudos')
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(private readonly kudosService: KudosService) {}

  @Post()
  create(
    @Body() dto: CreateKudosDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KudosRecord> {
    return this.kudosService.createKudos(dto.recipientId, user.id, dto.message);
  }

  @Get()
  getPage(@Query() query: KudosPageQueryDto): Promise<KudosPage> {
    return this.kudosService.getKudosPage(query.page);
  }

  @Sse('events')
  getEvents(): Observable<BoardEvent> {
    return this.kudosService.getBoardEvents();
  }
}
