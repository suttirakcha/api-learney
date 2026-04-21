import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SkillTestService {
  constructor(private prisma: PrismaService) {}

  async getStages() {
    return this.prisma.assessmentStage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getQuestions(stageSlug: string) {
    const stage = await this.prisma.assessmentStage.findUnique({
      where: { slug: stageSlug },
    });
    if (!stage) throw new NotFoundException('Stage not found');

    return this.prisma.careerDiscoveryQuestion.findMany({
      where: { stageId: stage.id, isActive: true },
      include: { choices: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createSession(stageSlug: string, userId: string) {
    const stage = await this.prisma.assessmentStage.findUnique({
      where: { slug: stageSlug },
    });
    if (!stage) throw new NotFoundException();

    // Resume if in progress
    let session = await this.prisma.assessmentSession.findFirst({
      where: { userId, stageId: stage.id, status: 'IN_PROGRESS' },
    });

    if (!session) {
      session = await this.prisma.assessmentSession.create({
        data: { userId, stageId: stage.id },
      });
    }

    return session;
  }

  async addAnswer(sessionId: string, questionId: string, choiceValue: number) {
    // upsert answer
    await this.prisma.assessmentAnswer.upsert({
      where: { sessionId_questionId: { sessionId, questionId } },
      update: { choiceValue },
      create: { sessionId, questionId, choiceValue },
    });
  }

  async finishSession(sessionId: string) {
    // score, AI analyze
    // call existing scoring
    const result = await this.processResult(sessionId);
    await this.prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' },
    });
    return result;
  }

  private async processResult(sessionId: string) {
    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException();

    const answers = await this.prisma.assessmentAnswer.findMany({
      where: { sessionId },
    });

    const stage = await this.prisma.assessmentStage.findUnique({
      where: { id: session.stageId },
    });

    const sessionData = {
      stage: stage?.titleTh || 'Unknown',
      answers,
    };

    const prompt = this.buildSkillInsightPrompt(sessionData);
    // TODO: Call AI service
    const insight = {
      strengths: ['Creativity', 'Leadership'],
      improvements: ['Time Management'],
      personality: 'Innovative Thinker',
      learningStyle: 'Visual + Hands-on',
      aiReadiness: 78,
      recommendedCareers: ['UX Designer', 'AI Content Creator'],
      positiveMessage: 'คุณมีศักยภาพมากกว่าที่คิด!',
    };

    // Save to AssessmentResult
    const result = await this.prisma.assessmentResult.create({
      data: {
        sessionId,
        topTraitsJson: JSON.stringify(['creativity']),
        growthAreasJson: JSON.stringify(['time']),
        careerMatchesJson: JSON.stringify(insight.recommendedCareers),
        aiSummary: insight.positiveMessage,
      },
    });

    return result;
  }

  private buildSkillInsightPrompt(result: any) {
    return `คุณคือผู้เชี่ยวชาญด้านจิตวิทยา การแนะแนวอาชีพ และการพัฒนาศักยภาพมนุษย์
วิเคราะห์ผลของผู้ใช้ต่อไปนี้อย่างเป็นมิตร ใช้ภาษาไทยเข้าใจง่าย ให้กำลังใจ และห้ามใช้ถ้อยคำด้านลบ

Stage: ${result.stage}
Answers: ${JSON.stringify(result.answers)}
Research: Growth Mindset by Dweck, etc.

Output JSON: {
  "strengths": ["item1", ...],
  "improvements": ["develop this"],
  "personality": "type",
  "learningStyle": "Visual",
  "aiReadiness": 78,
  "recommendedCareers": [...],
  "positiveMessage": "msg"
}`;
  }

  async getResult(id: string) {
    return this.prisma.assessmentResult.findUnique({
      where: { id },
      include: { session: true },
    });
  }

  async getAdminQuestions() {
    return this.prisma.careerDiscoveryQuestion.findMany({
      include: { choices: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createQuestion(data: any) {
    return this.prisma.careerDiscoveryQuestion.create({
      data: {
        ...data,
        stageId: data.stageId,
        choices: {
          create: data.choices,
        },
      },
    });
  }

  // Admin methods...
}
