import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BoardEventsModule } from './common/events/board-events.module';
import { KudosModule } from './kudos/kudos.module';
import { ModerationModule } from './moderation/moderation.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReactionsModule } from './reactions/reactions.module';

@Module({
  imports: [
    PrismaModule,
    BoardEventsModule,
    AuthModule,
    KudosModule,
    ReactionsModule,
    ModerationModule,
  ],
})
export class AppModule {}
