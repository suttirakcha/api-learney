import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';

const logger = new Logger('Bootstrap');

const defaultFrontendOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const allowedOrigins = [
    ...defaultFrontendOrigins,
    process.env.FRONTEND_URL,
  ].filter((origin, index, arr): origin is string => {
    return !!origin && arr.indexOf(origin) === index;
  });

  logger.log(`Allowed origins: ${allowedOrigins.join(', ')}`);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      logger.log(`Incoming origin: ${origin ?? 'no-origin'}`);

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (
        process.env.NODE_ENV !== 'production' &&
        localOriginPattern.test(origin)
      ) {
        return callback(null, true);
      }

      logger.error(`Blocked by CORS: ${origin}`);
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = Number(process.env.PORT ?? 8000);
  await app.listen(port);

  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Frontend URL: ${process.env.FRONTEND_URL ?? 'not set'}`);
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
