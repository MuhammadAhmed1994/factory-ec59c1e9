import { Module } from '@nestjs/common';
import { BoardEventsModule } from '../common/events/board-events.module';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';

@Module({
  imports: [PrismaModule, BoardEventsModule],
  controllers: [KudosController],
  providers: [KudosService, SessionAuthGuard],
  exports: [KudosService],
})
export class KudosModule {}
