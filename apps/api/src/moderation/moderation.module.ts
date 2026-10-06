import { Module } from '@nestjs/common';
import { BoardEventsModule } from '../common/events/board-events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [PrismaModule, BoardEventsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
