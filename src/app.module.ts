import { Module } from '@nestjs/common';
import { HomeShowcaseModule } from './home-showcase/home-showcase.module';

import { PrismaService } from './database/prisma.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { BcryptService } from './shared/securities/services/bcrypt.service';
import { AuthModule } from './auth/auth.module';

import { jwtConfigOptions } from './auth/config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from './config/config.module';
import { LessonModule } from './lesson/lesson.module';
import { CartModule } from './cart/cart.module';
import { AdminModule } from './admin/admin.module';
import { CourseModule } from './course/course.module';
import { InstructorModule } from './instructor/instructor.module';
import { UploadModule } from './upload/upload.module';
import { PaymentModule } from './payment/payment.module';
import { MailModule } from './mail/mail.module';
import { StatsModule } from './stats/stats.module';
import { ExperienceModule } from './experience/experience.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { AiModule } from './ai/ai.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { SkillTestModule } from './skill-test/skill-test.module';
import { PromotionModule } from './promotion/promotion.module';

@Module({
  imports: [
    HomeShowcaseModule,

    UsersModule,
    DatabaseModule,
    AuthModule,
    ConfigModule,
    JwtModule.registerAsync(jwtConfigOptions),
    LessonModule,
    CartModule,
    AdminModule,
    CourseModule,
    InstructorModule,
    UploadModule,
    PaymentModule,
    MailModule,
    StatsModule,
    ExperienceModule,
    WorkspaceModule,
    AiModule,
    ChatbotModule,
    SkillTestModule,
    PromotionModule,
  ],

  controllers: [],
  providers: [PrismaService, BcryptService],
})
export class AppModule {}
