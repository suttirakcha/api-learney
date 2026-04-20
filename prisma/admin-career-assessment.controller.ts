import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaClient } from '../database/generated/prisma/client';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // นำมาใช้จริงเพื่อป้องกันการเข้าถึง
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@Controller('admin/career-assessment')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('ADMIN')
export class AdminCareerAssessmentController {
  private prisma = new PrismaClient();

  @Get('dashboard')
  async getDashboardData() {
    // 1. จำนวน Session ทั้งหมด
    const totalSessions = await this.prisma.careerAssessmentSession.count();

    // 2. จำนวนคนที่ทำเสร็จ (ได้ Result)
    const completedResults = await this.prisma.careerAssessmentResult.count();

    // 3. อาชีพที่ถูกแนะนำบ่อยที่สุด (Top 5)
    const topCareers = await this.prisma.recommendedCareerMapping.groupBy({
      by: ['careerId'],
      where: { rank: 1 }, // นับเฉพาะที่ได้ที่ 1
      _count: { careerId: true },
      orderBy: { _count: { careerId: 'desc' } },
      take: 5,
    });

    // ดึงชื่ออาชีพมาประกอบ
    const careerIds = topCareers.map((c) => c.careerId);
    const careersData = await this.prisma.career.findMany({
      where: { id: { in: careerIds } },
    });
    const popularCareers = topCareers.map((tc) => ({
      name:
        careersData.find((c) => c.id === tc.careerId)?.name['th'] || 'Unknown',
      count: tc._count.careerId,
    }));

    // 4. ข้อมูลผลลัพธ์ล่าสุด 10 รายการ
    const recentResults = await this.prisma.careerAssessmentResult.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          include: { user: { select: { fullname: true, email: true } } },
        },
        recommendedCareers: {
          where: { rank: 1 },
          include: { career: { select: { name: true } } },
        },
      },
    });

    return {
      totalSessions,
      completedResults,
      popularCareers,
      recentResults: recentResults.map((r) => ({
        id: r.id,
        user: r.session.user?.fullname || 'Guest User',
        topCareer: r.recommendedCareers[0]?.career.name['th'] || '-',
        date: r.createdAt,
      })),
    };
  }
}
