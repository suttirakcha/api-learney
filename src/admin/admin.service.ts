import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Status } from 'src/database/generated/prisma/enums';

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
    const totalCourses = await this.prisma.course.count();

    const pending = await this.prisma.course.count({
      where: { status: Status.PENDING }, // ✅
    });

    const approved = await this.prisma.course.count({
      where: { status: Status.ACTIVE }, // ✅
    });

    const totalUsers = await this.prisma.user.count();

    return {
      totalCourses,
      pending,
      approved,
      totalUsers,
    };
  }
}
