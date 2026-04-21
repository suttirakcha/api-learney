import { Module } from '@nestjs/common';
import { ExperienceController } from './experience.controller';
import { ExperienceService } from './experience.service';
import { AdminExperienceController } from './admin-experience.controller';
import { AdminAssessmentController } from './admin-assessment.controller';
import { AiContentService } from './ai-content.service';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { SecuritiesModule } from '../shared/securities/securities.module';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';

@Module({
  imports: [DatabaseModule, SecuritiesModule],
  controllers: [
    ExperienceController,
    AdminExperienceController,
    AdminAssessmentController,
  ],
  providers: [
    PrismaService,
    AuthGuard,
    RoleGuard,
    ExperienceService,
    AiContentService,
  ],
  exports: [ExperienceService],
})
export class ExperienceModule {}
