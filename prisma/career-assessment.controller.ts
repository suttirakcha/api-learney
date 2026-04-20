import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '../database/generated/prisma/client';
import { SubmitCareerAssessmentDto } from './dto/submit-assessment.dto';
import { CareerAssessmentScoringService } from './career-assessment-scoring.service';

@Controller('career-assessment')
export class CareerAssessmentController {
  private prisma = new PrismaClient();

  constructor(private scoringService: CareerAssessmentScoringService) {}

  // 1. ดึงคำถามทั้งหมดพร้อมตัวเลือก (เรียงตาม Order)
  @Get('questions')
  async getQuestions() {
    return this.prisma.careerAssessmentQuestion.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      include: {
        options: { orderBy: { order: 'asc' } },
      },
    });
  }

  // 2. สร้าง Session ใหม่เมื่อเริ่มทำแบบประเมิน
  @Post('start')
  async startSession(@Req() req: any) {
    const userId = req.user?.id || null; // ถ้ามี token จะมี ID, ถ้าเป็น Guest จะเป็น null

    const session = await this.prisma.careerAssessmentSession.create({
      data: {
        userId,
        status: 'IN_PROGRESS',
      },
    });
    return session;
  }

  // 3. ส่งคำตอบและประมวลผล
  @Post('submit')
  async submitAssessment(@Body() body: SubmitCareerAssessmentDto) {
    const session = await this.prisma.careerAssessmentSession.findUnique({
      where: { id: body.sessionId },
    });
    if (!session || session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Session ไม่ถูกต้อง หรือทำแบบประเมินไปแล้ว',
      );
    }

    // บันทึกคำตอบ
    for (const ans of body.answers) {
      await this.prisma.careerAssessmentAnswer.create({
        data: {
          sessionId: session.id,
          questionId: ans.questionId,
          optionId: ans.optionId,
          ratingValue: ans.ratingValue,
        },
      });
    }

    // เรียก Engine ประมวลผลและสร้าง Result
    const result = await this.scoringService.evaluateSession(session.id);

    return { success: true, resultId: result.id };
  }

  // 4. ดึงข้อมูลผลลัพธ์แบบ Full ก้อน สำหรับแสดงในหน้า Result UI
  @Get('results/:id')
  async getResult(@Param('id') id: string) {
    const result = await this.prisma.careerAssessmentResult.findUnique({
      where: { id },
      include: {
        categoryScores: true,
        recommendedCareers: {
          include: {
            career: true,
          },
          orderBy: { rank: 'asc' },
        },
        recommendedCourses: {
          include: {
            course: { include: { instructor: true, categoryRecord: true } },
          },
        },
      },
    });

    if (!result) throw new NotFoundException('ไม่พบผลลัพธ์แบบประเมิน');
    return result;
  }
}
