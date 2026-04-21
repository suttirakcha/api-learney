import { Module } from '@nestjs/common';
import { SkillTestController } from './skill-test.controller';
import { SkillTestService } from './skill-test.service';
import { PrismaService } from '../database/prisma.service';
import { AssessmentAiService } from '../assessment-ai.service'; // existing

@Module({
  controllers: [SkillTestController],
  providers: [SkillTestService, PrismaService],
  imports: [], // add AI module if needed
})
export class SkillTestModule {}
