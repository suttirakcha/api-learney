import { Module } from '@nestjs/common';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { PrismaService } from '../database/prisma.service';
import { CourseModule } from '../course/course.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CourseModule, AuthModule],
  controllers: [PromotionController],
  providers: [PromotionService, PrismaService],
  exports: [PromotionService],
})
export class PromotionModule {}
