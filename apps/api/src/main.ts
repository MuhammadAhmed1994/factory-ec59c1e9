import { NestFactory } from '@nestjs/core';
import { AppModule, configureApp } from './app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
