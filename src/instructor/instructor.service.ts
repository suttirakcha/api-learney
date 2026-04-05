import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// ✅ ย้ายออกมานอก class
type CourseStat = {
  courseId: string;
  courseName: string;
  sales: number;
  revenue: number;
  students: number;
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
        enrolledCourses: true,
      },
    });

    const totalCourses = courses.length;

    // ===============================
    // ✅ 3. เตรียม map (กำหนด type!)
    // ===============================
    const courseStatsMap = new Map<string, CourseStat>();

    for (const course of courses) {
      courseStatsMap.set(course.id, {
        courseId: course.id,
        courseName: course.courseName,
        sales: course.enrolledCourses.length,
        revenue: course.enrolledCourses.length * Number(course.price),
        students: course.enrolledCourses.length,

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
    const courseStats = Array.from(courseStatsMap.values());
    const totalRevenue = courseStats.reduce(
      (sum, course) => sum + course.revenue,
      0,
    );
    const totalSales = courseStats.reduce(
      (sum, course) => sum + course.sales,
      0,
    );

    return {
      totalRevenue,
      platformFee: 0,
      totalSales,
      totalCourses,
      courses: courseStats,
    };
  }
}
