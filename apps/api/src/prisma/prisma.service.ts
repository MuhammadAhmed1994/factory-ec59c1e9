import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

interface PrismaClientLifecycle {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  [modelName: string]: any;
}

// Loading the generated client at runtime keeps TypeScript builds independent
// of whether Prisma Client has already been generated from the schema.
const PrismaClient = (require('@prisma/client') as {
  PrismaClient: new () => PrismaClientLifecycle;
}).PrismaClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
