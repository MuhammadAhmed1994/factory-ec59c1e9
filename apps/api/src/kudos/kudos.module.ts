import { Module } from '@nestjs/common';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { BoardEventsModule } from '../common/events/board-events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';

@Module({
  imports: [PrismaModule, BoardEventsModule],
  controllers: [KudosController],
  providers: [SessionAuthGuard, KudosService],
  exports: [KudosService],
})
export class KudosModule {}
