import { Controller, Post, Get, Param, Body, Req } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { AnalyzeRecommendationDto } from './dto/analyze-recommendation.dto';

@Controller('recommendation')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post('analyze')
  async analyze(@Body() dto: AnalyzeRecommendationDto, @Req() req: any) {
    const userId = req.user?.id; // ดึงจาก JWT Auth ถ้าระบบมี
    return this.recommendationService.analyze(dto, userId);
  }

  @Post(':id/save-course')
  // @UseGuards(JwtAuthGuard) // ⚠️ อย่าลืมเปิดใช้งาน Guard ถ้าระบบบังคับ Login
  async saveCourse(
    @Param('id') id: string,
    @Body('courseId') courseId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id; // ดึงจาก Auth
    return this.recommendationService.saveCourseFromRecommendation(
      id,
      courseId,
      userId,
    );
  }

  @Get(':id')
  async getResult(@Param('id') id: string) {
    return this.recommendationService.getRecommendationById(id);
  }
}
