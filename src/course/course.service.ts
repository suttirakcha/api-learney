import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

import { Prisma, Status } from '../database/generated/prisma/client';
import { QueryCourseDto, CreateCourseDto } from './dtos/course.dto';

// ✅ เพิ่มบรรทัดนี้

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  async getCourses(query: QueryCourseDto) {
    const { category, search } = query;

    const courses = await this.prisma.course.findMany({
      where: {
        status: Status.ACTIVE,

        ...(category && category !== 'คอร์สเรียนทั้งหมด' ? { category } : {}),

        ...(search
          ? {
              courseName: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {}),
      },

      include: {
        instructor: {
          select: {
            fullname: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return courses.map((course) => ({
      id: course.id,
      price: `฿${course.price.toNumber()}`,
      category: course.category,
      title: course.courseName,
      instructor: course.instructor.fullname,
      rating: Number(course.averageRating || 0),
      students: course.totalStudents,
      duration: course.totalDuration || '0 ชม.',
      level: 'ทุกระดับ',
      image: course.thumbnail,
    }));
  }

  async getCourseById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: true,
        courseDetails: true,
      },
    });

    if (!course) return null;

    return {
      id: course.id,
      title: course.courseName,
      description: course.description,
      price: `฿${course.price.toNumber()}`,
      instructor: course.instructor.fullname,
      image: course.thumbnail,
      lessons: course.courseDetails,
    };
  }

  // 🔥 CREATE COURSE (เพิ่มใหม่ + แก้ type)
  async createCourse(userId: string, dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        courseName: dto.courseName,
        description: dto.description,
        category: dto.category,
        tags: dto.tags,

        price: new Prisma.Decimal(dto.price),
        discount: new Prisma.Decimal(0),

        thumbnail: dto.thumbnail ?? '',

        instructorId: userId,
        status: 'PENDING',
      },
    });
  }
  // 🔥 instructor: ดูคอร์สตัวเอง
  async getMyCourses(userId: string) {
    return this.prisma.course.findMany({
      where: {
        instructorId: userId,
      },
      include: {
        reviews: true,
        cartItems: {
          include: {
            cart: {
              include: {
                payment: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔥 instructor dashboard
  async getInstructorDashboard(userId: string) {
    const courses = await this.getMyCourses(userId);

    let totalRevenue = 0;
    let totalSales = 0;

    const courseStats = courses.map((course) => {
      const paidItems = course.cartItems.filter(
        (item) => item.cart.payment?.status === 'ACTIVE',
      );

      const uniquePayments = new Map<string, number>();

      paidItems.forEach((item) => {
        const payment = item.cart.payment;

        if (payment) {
          uniquePayments.set(payment.id, Number(payment.amount));
        }
      });

      const revenue = Array.from(uniquePayments.values()).reduce(
        (sum, val) => sum + val,
        0,
      );

      const sales = uniquePayments.size;

      totalRevenue += revenue;
      totalSales += sales;

      return {
        courseId: course.id,
        courseName: course.courseName,
        sales,
        revenue,
        students: course.totalStudents,
        rating:
          course.reviews.length > 0
            ? Number(
                (
                  course.reviews.reduce((s, r) => s + r.rating, 0) /
                  course.reviews.length
                ).toFixed(1),
              )
            : 0,
      };
    });

    return {
      totalRevenue,
      totalSales,
      totalCourses: courses.length,
      courses: courseStats,
    };
  }
}
