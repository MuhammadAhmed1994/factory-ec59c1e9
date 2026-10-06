import { INestApplication, Module, ValidationPipe } from '@nestjs/common';

@Module({})
export class AppModule {}

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
