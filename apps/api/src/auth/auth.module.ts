import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService, PRISMA_SERVICE } from './auth.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: PRISMA_SERVICE, useExisting: PrismaService }],
  exports: [AuthService],
})
export class AuthModule {}
