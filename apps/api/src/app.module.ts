import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { KudosModule } from './kudos/kudos.module';
import { ReactionsModule } from './reactions/reactions.module';
import { ModerationModule } from './moderation/moderation.module';
import { PrismaModule } from './prisma/prisma.module';
import { BoardEventsModule } from './common/events/board-events.module';

@Module({
  imports: [
    AuthModule,
    KudosModule,
    ReactionsModule,
    ModerationModule,
    PrismaModule,
    BoardEventsModule,
  ],
})
export class AppModule {}
