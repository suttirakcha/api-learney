import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

const defaultFrontendOrigin = 'http://localhost:3000';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const allowedOrigins = [
    defaultFrontendOrigin,
    process.env.FRONTEND_URL,
  ].filter((origin, index, origins): origin is string => {
    return Boolean(origin) && origins.indexOf(origin) === index;
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap().catch(console.error);
