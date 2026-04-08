import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { BcryptService } from '../shared/securities/services/bcrypt.service';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { PaymentStatus } from '../database/generated/prisma/client';
import { UpdateProfileDto } from './dtos/update-profile.dto';

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

  async getMyOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrolledCourses: {
          include: {
            course: {
              include: {
                instructor: {
                  select: {
                    fullname: true,
                  },
                },
              },
            },
          },
        },
        payment: {
          where: {
            status: PaymentStatus.SUCCESS,
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
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const purchasedAtByCourseId = new Map<string, string>();

    for (const payment of user.payment) {
      for (const item of payment.cart.cartItems) {
        if (!purchasedAtByCourseId.has(item.courseId)) {
          purchasedAtByCourseId.set(item.courseId, payment.createdAt.toISOString());
        }
      }
    }

    const courses = user.enrolledCourses.map((enrollment) => ({
      courseId: enrollment.courseId,
      courseName: enrollment.course.courseName,
      category: enrollment.course.category,
      thumbnail: enrollment.course.thumbnail,
      instructorName: enrollment.course.instructor.fullname,
      purchasedAt: purchasedAtByCourseId.get(enrollment.courseId) ?? null,
    }));

    const totalSpent = user.payment.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    return {
      stats: {
        enrolledCourses: courses.length,
        successfulPayments: user.payment.length,
        totalSpent,
      },
      courses,
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        NOT: {
          id: userId,
        },
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullname: dto.fullname,
        email: dto.email,
        phone: dto.phone || null,
        image: dto.image || null,
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        enrolledCourses: {
          select: {
            courseId: true,
          },
        },
      },
    });

    return user;
  }

  async changeMyPassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await this.bcryptService.compare(
      dto.currentPassword,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await this.bcryptService.compare(
      dto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedPassword = await this.bcryptService.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: 'Password changed successfully',
    };
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
}
