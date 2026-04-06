import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { BcryptService } from '../shared/securities/services/bcrypt.service';
import { PaymentStatus } from '../database/generated/prisma/enums';
import { parsePaymentEvidence } from '../payment/payment.utils';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcryptService: BcryptService,
  ) {}

  async findUsers() {
    const users = await this.prisma.user.findMany();
    return users;
  }

  async createUser(createUserDto: CreateUserDto) {
    const hashedPassword = await this.bcryptService.hash(
      createUserDto.password,
    );
    const user = await this.prisma.user.create({
      data: {
        fullname: createUserDto.fullname,
        email: createUserDto.email,
        password: hashedPassword,
      },
    });
    return user;
  }
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  async updatePassword(id: string, password: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { password },
    });
  }

  async getOverview(userId: string) {
    const [successfulPayments, enrolledCourses] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          userId,
          status: PaymentStatus.SUCCESS,
        },
        select: {
          amount: true,
          evidence: true,
          updatedAt: true,
          cart: {
            select: {
              cartItems: {
                select: {
                  courseId: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.enrolledCourse.findMany({
        where: {
          userId,
        },
        include: {
          course: {
            select: {
              id: true,
              courseName: true,
              category: true,
              thumbnail: true,
              createdAt: true,
              instructor: {
                select: {
                  fullname: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const purchaseDateByCourseId = new Map<string, string>();

    successfulPayments.forEach((payment) => {
      const evidence = parsePaymentEvidence(payment.evidence);
      const fallbackDate = payment.updatedAt.toISOString();
      const fallbackCourseIds = payment.cart.cartItems.map((item) => item.courseId);

      evidence.transactions.forEach((transaction) => {
        transaction.courseIds.forEach((courseId) => {
          const existingDate = purchaseDateByCourseId.get(courseId);

          if (!existingDate || new Date(transaction.confirmedAt) > new Date(existingDate)) {
            purchaseDateByCourseId.set(courseId, transaction.confirmedAt);
          }
        });
      });

      fallbackCourseIds.forEach((courseId) => {
        if (!purchaseDateByCourseId.has(courseId)) {
          purchaseDateByCourseId.set(courseId, fallbackDate);
        }
      });
    });

    const uniqueCourses = new Map<
      string,
      {
        courseId: string;
        courseName: string;
        category: string;
        thumbnail: string;
        instructorName: string;
        purchasedAt: string | null;
        createdAt: string;
      }
    >();

    enrolledCourses.forEach(({ course }) => {
      const purchasedAt = purchaseDateByCourseId.get(course.id) ?? null;
      const existingCourse = uniqueCourses.get(course.id);

      if (
        !existingCourse ||
        (purchasedAt &&
          (!existingCourse.purchasedAt ||
            new Date(purchasedAt) > new Date(existingCourse.purchasedAt)))
      ) {
        uniqueCourses.set(course.id, {
          courseId: course.id,
          courseName: course.courseName,
          category: course.category,
          thumbnail: course.thumbnail,
          instructorName: course.instructor.fullname,
          purchasedAt,
          createdAt: course.createdAt.toISOString(),
        });
      }
    });

    const courses = Array.from(uniqueCourses.values())
      .sort((firstCourse, secondCourse) => {
        const firstDate = firstCourse.purchasedAt ?? firstCourse.createdAt;
        const secondDate = secondCourse.purchasedAt ?? secondCourse.createdAt;

        return new Date(secondDate).getTime() - new Date(firstDate).getTime();
      })
      .map(({ createdAt: _createdAt, ...course }) => course);

    const totalSpent = successfulPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    return {
      stats: {
        enrolledCourses: courses.length,
        successfulPayments: successfulPayments.length,
        totalSpent: Number(totalSpent.toFixed(2)),
      },
      courses,
    };
  }
}
