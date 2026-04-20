import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AssessmentCourseRecommendationService {
  constructor(private prisma: PrismaService) {}

  async recommend(careerMatches: any[]) {
    // Example logic: Extract keywords from careers to match categories or tags
    const keywords = careerMatches.map((c) =>
      c.title.split(' ')[0].toLowerCase(),
    );

    // Fetch real courses safe from null errors
    const courses = await this.prisma.course.findMany({
      where: {
        isPublished: true,
        // This is a simplified matching. You can map keywords to specific categoryIds in production.
      },
      take: 3,
      select: {
        id: true,
        courseName: true,
        title: true,
        coverImage: true,
        slug: true,
      },
    });

    return courses;
  }
}
