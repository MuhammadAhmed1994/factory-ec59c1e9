import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { BoardEvent } from '../common/events/board-events.service';
import { CreateKudosDto, KudosPageQueryDto } from './dto/create-kudos.dto';
import { KudosDetails, KudosService } from './kudos.service';

@Controller('kudos')
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(private readonly kudosService: KudosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') authorId: string,
    @Body() input: CreateKudosDto,
  ): Promise<KudosDetails> {
    return this.kudosService.createKudos(authorId, input);
  }

  @Get()
  list(@Query() query: KudosPageQueryDto): Promise<KudosDetails[]> {
    return this.kudosService.listVisibleKudos(query.page);
  }

  @Sse('events')
  events(): Observable<BoardEvent> {
    return this.kudosService.getBoardEvents();
  }
}
