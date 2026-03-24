import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ✅ เปิด validation (สำคัญมาก)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ตัด field ที่ไม่ได้อยู่ใน DTO
      forbidNonWhitelisted: true, // ถ้ามี field แปลก → error
      transform: true, // auto แปลง type
    }),
  );

  // ✅ เปิด CORS (frontend จะเรียกได้)
  app.enableCors();
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap().catch((error) => console.log(error));
