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
    const now = new Date();

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
        promotions: {
          where: {
            promotion: {
              active: true,
              startDate: { lte: now },
              endDate: { gte: now },
            },
          },
          include: {
            promotion: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return courses.map((course) => {
      const activePromotions = [...course.promotions].sort(
        (left, right) => right.promotion.priority - left.promotion.priority,
      );

      let discountPrice = Number(course.price);
      const promo = activePromotions[0]?.promotion;

      if (promo) {
        if (promo.discount !== null) {
          discountPrice = discountPrice * (1 - Number(promo.discount) / 100);
        } else if (promo.discountAmount !== null) {
          discountPrice = Math.max(
            0,
            discountPrice - Number(promo.discountAmount),
          );
        }
      }

      return {
        ...course,
        discountPrice: new Prisma.Decimal(discountPrice.toFixed(2)),
        instructor: course.instructor.fullname,
      };
    });
  }

  async getCourseById(id: string) {
    const now = new Date();
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: { fullname: true },
        },
        courseDetails: {
          orderBy: { createdAt: 'asc' },
        },
        promotions: {
          where: {
            promotion: {
              active: true,
              startDate: { lte: now },
              endDate: { gte: now },
            },
          },
          include: {
            promotion: true,
          },
        },
      },
    });

    if (!course) return null;

    const activePromotions = [...course.promotions].sort(
      (left, right) => right.promotion.priority - left.promotion.priority,
    );

    let discountPrice = Number(course.price);
    const promo = activePromotions[0]?.promotion;

    if (promo) {
      if (promo.discount !== null) {
        discountPrice = discountPrice * (1 - Number(promo.discount) / 100);
      } else if (promo.discountAmount !== null) {
        discountPrice = Math.max(
          0,
          discountPrice - Number(promo.discountAmount),
        );
      }
    }

    return {
      ...course,
      discountPrice: new Prisma.Decimal(discountPrice.toFixed(2)),
      instructor: course.instructor.fullname,
    };
  }

  // 🔥 CREATE COURSE (เพิ่มใหม่ + แก้ type)
  async createCourse(userId: string, dto: CreateCourseDto) {
    return await this.prisma.course.create({
      data: {
        courseName: dto.courseName,
        description: dto.description,
        category: dto.category,
        tags: dto.tags,

        price: new Prisma.Decimal(dto.price),
        discount: new Prisma.Decimal(0),

        thumbnail: dto.thumbnail ?? '',
        videoPreview: dto.videoPreview ?? null,
        instructorId: userId,
        status: 'PENDING',
      },
    });
  }
  // 🔥 instructor: ดูคอร์สตัวเอง
  async getMyCourses(userId: string) {
    return await this.prisma.course.findMany({
      where: {
        instructorId: userId,
      },
      include: {
        reviews: true,
        enrolledCourses: {
          select: {
            id: true,
          },
        },
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
    const courses = await this.prisma.course.findMany({
      where: {
        instructorId: userId,
      },
      include: {
        reviews: true,
        enrolledCourses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = await this.prisma.course.aggregate({
      _count: true,
    });

    console.log('Total courses:', totalRevenue._count);

    let totalSales = 0;

    const courseStats = courses.map((course) => {
      const sales = course.enrolledCourses.length;
      const revenue = sales * Number(course.price);

      // totalRevenue += revenue;
      totalSales += sales;

      return {
        courseId: course.id,
        courseName: course.courseName,
        sales,
        revenue,
        students: sales,

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
