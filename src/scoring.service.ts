import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssessmentAiService } from './assessment-ai.service';
import { AssessmentCourseRecommendationService } from './assessment-course-recommendation.service';

@Injectable()
export class ScoringService {
  constructor(
    private prisma: PrismaService,
    private aiService: AssessmentAiService,
    private courseRecService: AssessmentCourseRecommendationService,
  ) {}

  async processAndSubmit(sessionId: string, userId: string) {
    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { answers: { include: { question: true } }, stage: true },
    });

    if (!session || session.userId !== userId)
      throw new BadRequestException('Invalid session');
    if (session.answers.length === 0)
      throw new BadRequestException('No answers provided');

    const traitScores: Record<string, { total: number; max: number }> = {};

    // 1. Calculate Scores
    session.answers.forEach((ans) => {
      const { traitCode, scoreWeight, reverseScore } = ans.question;
      if (!traitScores[traitCode])
        traitScores[traitCode] = { total: 0, max: 0 };

      let val = ans.choiceValue;
      if (reverseScore) val = 6 - val; // Assuming 1-5 scale

      traitScores[traitCode].total += val * scoreWeight;
      traitScores[traitCode].max += 5 * scoreWeight;
    });

    // Normalize to 0-100
    const normalized = Object.entries(traitScores)
      .map(([code, data]) => ({
        traitCode: code,
        score: Math.round((data.total / data.max) * 100),
      }))
      .sort((a, b) => b.score - a.score);

    const topTraits = normalized.slice(0, 5);
    const growthAreas = normalized.slice(-3);

    // 2. Map to Careers (Simplified deterministic mapping)
    const careerMatches = this.mapCareers(topTraits);

    // 3. AI Summary
    const aiSummary = await this.aiService.generateSummary({
      stage: session.stage.titleTh,
      topTraits: topTraits.map((t) => t.traitCode),
      growthAreas: growthAreas.map((t) => t.traitCode),
    });

    // 4. Find Recommended Courses
    const recommendedCourses =
      await this.courseRecService.recommend(careerMatches);

    // 5. Save Result
    await this.prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    const result = await this.prisma.assessmentResult.create({
      data: {
        sessionId,
        topTraitsJson: topTraits,
        growthAreasJson: growthAreas,
        careerMatchesJson: {
          careers: careerMatches,
          courses: recommendedCourses,
        },
        aiSummary,
      },
    });

    return result;
  }

  private mapCareers(traits: any[]) {
    const topCodes = traits.map((t) => t.traitCode);
    const careers = [];

    if (topCodes.includes('creativity') || topCodes.includes('communication')) {
      careers.push({
        title: 'Content Creator',
        reason: 'คุณมีความคิดสร้างสรรค์และสื่อสารได้ดี',
      });
    }
    if (topCodes.includes('logic') || topCodes.includes('curiosity')) {
      careers.push({
        title: 'Software Developer',
        reason: 'คุณชอบการแก้ปัญหาและมีตรรกะที่ยอดเยี่ยม',
      });
    }

    if (careers.length === 0)
      careers.push({
        title: 'General Specialist',
        reason: 'คุณมีทักษะที่สมดุลและปรับตัวเก่ง',
      });
    return careers;
  }
}
