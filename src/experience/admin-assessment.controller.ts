import { Controller, Get, UseGuards } from '@nestjs/common';
import { ExperienceService } from './experience.service';
// import { AuthGuard } from '../auth/guards/auth.guard'; // นำเข้า Guard ของคุณถ้าต้องการล็อคสิทธิ์

@Controller('admin/assessments')
export class AdminAssessmentController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Get('career-history')
  // @UseGuards(AuthGuard) // แนะนำให้เปิดใช้งาน Guard เพื่อป้องกันคนนอกเรียก API ของแอดมิน
  async getCareerHistory() {
    return this.experienceService.getAdminCareerHistory();
  }
}
