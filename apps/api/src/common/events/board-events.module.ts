import { Module } from '@nestjs/common';
import { BoardEventsService } from './board-events.service';

@Module({
  providers: [BoardEventsService],
  exports: [BoardEventsService],
})
export class BoardEventsModule {}
