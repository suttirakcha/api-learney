import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role, Status } from '../database/generated/prisma/enums';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicStats() {
    const [totalUsers, totalInstructors, totalCourses, ratingAgg] =
      await Promise.all([
        this.prisma.user.count({ where: { role: Role.USER } }),
        this.prisma.user.count({ where: { role: Role.INSTRUCTOR } }),
        this.prisma.course.count({ where: { status: Status.ACTIVE } }),
        this.prisma.review.aggregate({ _avg: { rating: true } }),
      ]);

    const avgRating = ratingAgg._avg.rating
      ? Number(ratingAgg._avg.rating.toFixed(1))
      : null;

    return { totalUsers, totalInstructors, totalCourses, avgRating };
  }
}
