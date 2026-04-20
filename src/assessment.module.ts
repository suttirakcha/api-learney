import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {
  AssessmentController,
  AdminAssessmentQuestionController,
} from './assessment.controller';
import { ScoringService } from './services/scoring.service';
import { AssessmentAiService } from './services/assessment-ai.service';
import { AssessmentCourseRecommendationService } from './services/assessment-course-recommendation.service';
import { SecuritiesModule } from '../shared/securities/securities.module';

@Module({
  imports: [DatabaseModule, SecuritiesModule],
  controllers: [AssessmentController, AdminAssessmentQuestionController],
  providers: [
    ScoringService,
    AssessmentAiService,
    AssessmentCourseRecommendationService,
  ],
})
export class AssessmentModule {}
