import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionAuthGuard } from '../common/auth/session-auth.guard';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReactionsController],
  providers: [ReactionsService, SessionAuthGuard],
  exports: [ReactionsService],
})
export class ReactionsModule {}
