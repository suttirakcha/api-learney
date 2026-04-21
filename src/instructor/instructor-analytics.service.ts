import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InstructorAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getInstructorRevenue(
    userId: string,
    period: 'month' | 'year' = 'month',
  ) {
    const where = { instructorId: userId };
    // Group by month/year revenue from payments
    return this.prisma.payment.groupBy({
      by: ['createdAt'],
      where: {
        status: 'SUCCESS',
        cart: { cartItems: { some: { course: where } } },
      },
      _sum: { amount: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getStudentEngagement(courseId: string) {
    return this.prisma.courseLesson.groupBy({
      by: ['id'],
      where: { courseId },
      _count: true,
    });
  }
}
