import { Module } from '@nestjs/common';
import { BoardEventsModule } from '../common/events/board-events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';

@Module({
  imports: [PrismaModule, BoardEventsModule],
  controllers: [KudosController],
  providers: [KudosService],
  exports: [KudosService],
})
export class KudosModule {}
