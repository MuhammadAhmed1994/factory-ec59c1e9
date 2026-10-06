import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Post,
  Query,
  Sse,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/auth/current-user.decorator';
import {
  AuthenticatedUser,
  SessionAuthGuard,
} from '../common/auth/session-auth.guard';
import { BoardEvent } from '../common/events/board-events.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosDetails, KudosService } from './kudos.service';

export class KudosPageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;
}

@Catch(BadRequestException)
export class KudosValidationExceptionFilter
  implements ExceptionFilter<BadRequestException>
{
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const responseBody = exception.getResponse();
    const body =
      typeof responseBody === 'object' && responseBody !== null
        ? responseBody
        : { message: responseBody };
    host.switchToHttp().getResponse<Response>().status(422).json({
      ...body,
      statusCode: 422,
      error: 'Unprocessable Entity',
    });
  }
}

@Controller('kudos')
@UseGuards(SessionAuthGuard)
@UseFilters(KudosValidationExceptionFilter)
export class KudosController {
  constructor(private readonly kudosService: KudosService) {}

  @Post()
  create(
    @Body() input: CreateKudosDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KudosDetails> {
    return this.kudosService.createKudos(user.id, input);
  }

  @Get()
  list(@Query() query: KudosPageQueryDto): Promise<KudosDetails[]> {
    return this.kudosService.listVisibleKudos(query.page);
  }

  @Sse('events')
  events(): Observable<BoardEvent> {
    return this.kudosService.getEvents();
  }
}
