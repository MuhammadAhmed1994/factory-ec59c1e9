import { Body, Controller, Get, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { BoardEvent } from '../common/events/board-events.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosBoardItem, KudosDetails, KudosService } from './kudos.service';

export class KudosPageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}

@Controller('kudos')
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(private readonly kudosService: KudosService) {}

  @Post()
  create(
    @CurrentUser('id') authorId: string,
    @Body() details: CreateKudosDto,
  ): Promise<KudosDetails> {
    return this.kudosService.createKudos(authorId, details);
  }

  @Get()
  getKudos(@Query() query: KudosPageQueryDto): Promise<KudosBoardItem[]> {
    return this.kudosService.getKudos(query.page);
  }

  @Sse('events')
  getEvents(): Observable<BoardEvent> {
    return this.kudosService.getBoardEvents();
  }
}
