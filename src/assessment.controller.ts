import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ScoringService } from './services/scoring.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PrismaService } from '../database/prisma.service';

@Controller('assessment')
export class AssessmentController {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stages')
  async getStages() {
    return this.prisma.assessmentStage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Get('questions')
  async getQuestions(@Query('stage') stageSlug: string) {
    const stage = await this.prisma.assessmentStage.findUnique({
      where: { slug: stageSlug },
    });
    if (!stage) throw new BadRequestException('Stage not found');

    return this.prisma.assessmentQuestion.findMany({
      where: { stageId: stage.id, isActive: true, deletedAt: null },
      include: { choices: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Post('sessions')
  @UseGuards(AuthGuard)
  async createSession(@Req() req: any, @Body('stageSlug') stageSlug: string) {
    const stage = await this.prisma.assessmentStage.findUnique({
      where: { slug: stageSlug },
    });
    if (!stage) throw new BadRequestException('Stage not found');

    // Auto-resume existing active session if found
    let session = await this.prisma.assessmentSession.findFirst({
      where: { userId: req.user.sub, stageId: stage.id, status: 'IN_PROGRESS' },
    });

    if (!session) {
      session = await this.prisma.assessmentSession.create({
        data: { userId: req.user.sub, stageId: stage.id },
      });
    }
    return session;
  }

  @Post('sessions/:id/answers')
  @UseGuards(AuthGuard)
  async saveAnswer(
    @Req() req: any,
    @Param('id') sessionId: string,
    @Body() body: { questionId: string; choiceValue: number },
  ) {
    // Safe upsert for auto-save
    return this.prisma.assessmentAnswer.upsert({
      where: {
        sessionId_questionId: { sessionId, questionId: body.questionId },
      },
      update: { choiceValue: body.choiceValue },
      create: {
        sessionId,
        questionId: body.questionId,
        choiceValue: body.choiceValue,
      },
    });
  }

  @Post('sessions/:id/submit')
  @UseGuards(AuthGuard)
  async submitSession(@Req() req: any, @Param('id') sessionId: string) {
    return this.scoringService.processAndSubmit(sessionId, req.user.sub);
  }

  @Get('results/:id')
  @UseGuards(AuthGuard)
  async getResult(@Req() req: any, @Param('id') sessionId: string) {
    const result = await this.prisma.assessmentResult.findUnique({
      where: { sessionId },
      include: { session: { include: { stage: true } } },
    });
    if (!result || result.session.userId !== req.user.sub) {
      throw new BadRequestException('Result not found or unauthorized');
    }
    return result;
  }
}

@Controller('admin/assessment/questions')
export class AdminAssessmentQuestionController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createQuestion(@Body() body: any) {
    const {
      stageId,
      questionText,
      helperText,
      type,
      traitCode,
      traitDimension,
      scoreWeight,
      reverseScore,
      sortOrder,
      choices,
    } = body;

    return this.prisma.assessmentQuestion.create({
      data: {
        stageId,
        questionText,
        helperText,
        type: type || 'LIKERT_5',
        traitCode,
        traitDimension,
        scoreWeight: scoreWeight ? Number(scoreWeight) : 1,
        reverseScore: reverseScore || false,
        sortOrder: sortOrder ? Number(sortOrder) : 0,
        choices: choices
          ? {
              create: choices.map((c: any, index: number) => ({
                label: c.label,
                value: Number(c.value),
                sortOrder:
                  c.sortOrder !== undefined ? Number(c.sortOrder) : index,
              })),
            }
          : undefined,
      },
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateQuestion(@Param('id') id: string, @Body() body: any) {
    const { choices, ...dataToUpdate } = body;

    // หากมีการส่ง choices มาด้วย ให้ลบตัวเลือกเดิมออกแล้วสร้างใหม่ทั้งหมดเพื่อความสมบูรณ์
    if (choices) {
      await this.prisma.assessmentChoice.deleteMany({
        where: { questionId: id },
      });
      dataToUpdate.choices = {
        create: choices.map((c: any, index: number) => ({
          label: c.label,
          value: Number(c.value),
          sortOrder: c.sortOrder !== undefined ? Number(c.sortOrder) : index,
        })),
      };
    }

    return this.prisma.assessmentQuestion.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteQuestion(@Param('id') id: string) {
    // Soft Delete: เปลี่ยนสถานะเป็น Inactive และเก็บวันที่ลบ เพื่อไม่ให้กระทบประวัติคนเคยทำ
    return this.prisma.assessmentQuestion.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
