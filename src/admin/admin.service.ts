import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaymentStatus, Status } from 'src/database/generated/prisma/enums';
import { getMockTransactionCount } from '../payment/payment.utils';

@Injectable()
export class AdminService {
  private logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  // 📥 pending
  async getPendingCourses(page = 1, limit = 10) {
    return this.prisma.course.findMany({
      where: { status: Status.PENDING },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        instructor: {
          select: {
            fullname: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 📥 approved
  async getApprovedCourses(page = 1, limit = 10) {
    return this.prisma.course.findMany({
      where: { status: Status.ACTIVE },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        instructor: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ✅ approve
  async approveCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.logger.log(`Approve course: ${id}`);

    return this.prisma.course.update({
      where: { id },
      data: { status: Status.ACTIVE },
    });
  }

  // ❌ delete
  async deleteCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.logger.warn(`Delete course: ${id}`);

    return this.prisma.course.delete({
      where: { id },
    });
  }

  // 📊 dashboard
  async getDashboard() {
    const revenue = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.SUCCESS },
    });

    const totalRevenue = Number(revenue._sum.amount || 0);

    const successfulPayments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.SUCCESS },
      select: {
        evidence: true,
        amount: true,
      },
    });
    const totalSales = successfulPayments.reduce((sum, payment) => {
      return (
        sum +
        getMockTransactionCount(
          payment.evidence,
          Number(payment.amount) > 0 ? 1 : 0,
        )
      );
    }, 0);

    const totalCourses = await this.prisma.course.count({
      where: { status: Status.ACTIVE },
    });

    const platformFee = Number((totalRevenue * 0.15).toFixed(2));

    return {
      totalRevenue,
      platformFee,
      totalSales,
      totalCourses,
    };
  }

  // 📊 course performance
  async getCoursePerformance() {
    const courses = await this.prisma.course.findMany({
      where: { status: Status.ACTIVE },
      include: {
        reviews: true,
        enrolledCourses: true,
      },
    });

    return courses.map((course) => {
      const sales = course.enrolledCourses.length;
      const revenue = sales * Number(course.price);

      const rating =
        course.reviews.length > 0
          ? course.reviews.reduce((sum, r) => sum + r.rating, 0) /
            course.reviews.length
          : 0;

      return {
        courseId: course.id,
        courseName: course.courseName,
        sales,
        revenue,
        rating: Number(rating.toFixed(1)),
        platformFee: Number((revenue * 0.15).toFixed(2)),
        instructorEarn: Number((revenue * 0.85).toFixed(2)),
      };
    });
  }

  // 📊 category stats
  async getCategoryStats() {
    const courses = await this.prisma.course.findMany({
      where: { status: Status.ACTIVE },
    });

    const map: Record<string, number> = {};

    courses.forEach((c) => {
      map[c.category] = (map[c.category] || 0) + 1;
    });

    return map;
  }
}
