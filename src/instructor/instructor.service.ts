import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// ✅ ย้ายออกมานอก class
type CourseStat = {
  courseId: string;
  courseName: string;
  sales: number;
  revenue: number;

  rating: number;
};

@Injectable()
export class InstructorService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    // ===============================
    // ✅ 1. ดึง courses ของ instructor
    // ===============================
    const courses = await this.prisma.course.findMany({
      where: {
        instructorId: userId,
        status: 'ACTIVE',
      },
      include: {
        reviews: true,
      },
    });

    const totalCourses = courses.length;

    // ===============================
    // ✅ 2. ดึง payments
    // ===============================
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        cart: {
          include: {
            cartItems: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    // ===============================
    // ✅ 3. เตรียม map (กำหนด type!)
    // ===============================
    const courseStatsMap = new Map<string, CourseStat>();

    for (const course of courses) {
      courseStatsMap.set(course.id, {
        courseId: course.id,
        courseName: course.courseName,
        sales: 0,
        revenue: 0,

        rating:
          course.reviews.length > 0
            ? course.reviews.reduce((sum, r) => sum + r.rating, 0) /
              course.reviews.length
            : 0,
      });
    }

    // ===============================
    // ✅ 4. คำนวณ earnings + sales
    // ===============================
    let totalRevenue = 0;
    let totalSales = 0;

    for (const payment of payments) {
      let hasSale = false;

      for (const item of payment.cart.cartItems) {
        const course = item.course;

        if (course.instructorId === userId) {
          totalRevenue += Number(course.price);

          // ✅ ดึง stat ที่ถูกต้อง
          const stat = courseStatsMap.get(course.id);

          if (stat) {
            stat.sales += 1;
            stat.revenue += Number(course.price);
          }

          hasSale = true;
        }
      }

      if (hasSale) totalSales += 1;
    }

    return {
      totalRevenue,
      platformFee: 0,
      totalSales,
      totalCourses,
      courses: Array.from(courseStatsMap.values()),
    };
  }
}
