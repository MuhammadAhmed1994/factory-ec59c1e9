import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/auth/roles.guard';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { BoardEventsModule } from '../common/events/board-events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [PrismaModule, BoardEventsModule],
  controllers: [ModerationController],
  providers: [ModerationService, SessionAuthGuard, RolesGuard],
})
export class ModerationModule {}
