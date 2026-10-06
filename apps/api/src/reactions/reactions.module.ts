import { Module } from '@nestjs/common';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReactionsController],
  // The route requires a validated session before accepting the member identity.
  providers: [ReactionsService, SessionAuthGuard],
  exports: [ReactionsService],
})
export class ReactionsModule {}
