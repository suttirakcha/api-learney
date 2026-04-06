import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { BcryptService } from '../shared/securities/services/bcrypt.service';
import { PaymentStatus } from '../database/generated/prisma/enums';
import { parsePaymentEvidence } from '../payment/payment.utils';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

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

  toSafeUser<T extends { password?: string | null }>(
    user: T & {
      id: string;
      fullname: string;
      email: string;
      role: string;
      phone?: string | null;
      image?: string | null;
      enrolledCourses?: { courseId: string }[];
    },
  ) {
    return {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      phone: user.phone ?? undefined,
      image: user.image ?? undefined,
      enrolledCourses: user.enrolledCourses?.map(({ courseId }) => ({
        courseId,
      })),
    };
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

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    if (
      updateProfileDto.email &&
      updateProfileDto.email !== existingUser.email
    ) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });

      if (emailInUse && emailInUse.id !== userId) {
        throw new ConflictException('Email already exists');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullname: updateProfileDto.fullname ?? existingUser.fullname,
        email: updateProfileDto.email ?? existingUser.email,
        phone: updateProfileDto.phone?.trim() || null,
        image: updateProfileDto.image?.trim() || null,
      },
    });

    return this.toSafeUser(updatedUser);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await this.bcryptService.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedPassword = await this.bcryptService.hash(
      changePasswordDto.newPassword,
    );

    await this.updatePassword(userId, hashedPassword);

    return {
      message: 'Password updated successfully',
    };
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
      const fallbackCourseIds = payment.cart.cartItems.map(
        (item) => item.courseId,
      );

      evidence.transactions.forEach((transaction) => {
        transaction.courseIds.forEach((courseId) => {
          const existingDate = purchaseDateByCourseId.get(courseId);

          if (
            !existingDate ||
            new Date(transaction.confirmedAt) > new Date(existingDate)
          ) {
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
