import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  buildAiSuggestions,
  calculateAverageCompletion,
  summarizePopularCategories,
} from './instructor.helpers';

@Injectable()
export class InstructorService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    // All instructor courses for stats
    const allCourses = await this.prisma.course.findMany({
      where: { instructorId: userId },
      include: {
        reviews: true,
        enrolledCourses: { include: { user: true } },
        categoryRecord: true,
      },
    });

    // Recent courses: last 5 updated
    const recentCourses = await this.prisma.course.findMany({
      where: { instructorId: userId },
      select: {
        id: true,
        courseName: true,
        category: true,
        categoryRecord: { select: { name: true } },
        status: true,
        workflowStatus: true,
        enrolledCourses: { select: { id: true }, take: 1 }, // Just count approx
        reviews: { select: { id: true }, take: 1 },
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Recent students: recent 5 enrollments
    const recentStudents = await this.prisma.enrolledCourse.findMany({
      where: { course: { instructorId: userId } },
      include: {
        user: { select: { fullname: true, image: true } },
        course: { select: { courseName: true } },
      },
      orderBy: { id: 'desc' },
      take: 5,
    });

    // Accurate revenue: sum successful payments
    const totalRevenueResult = await this.prisma.payment.aggregate({
      where: {
        userId,
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });
    const totalRevenue = Number(totalRevenueResult._sum.amount || 0);

    // Counts
    const [totalCourses, totalPublishedCourses, pendingCourses] =
      await Promise.all([
        this.prisma.course.count({ where: { instructorId: userId } }),
        this.prisma.course.count({
          where: {
            instructorId: userId,
            OR: [{ status: 'ACTIVE' }, { isPublished: true }],
          },
        }),
        this.prisma.course.count({
          where: {
            instructorId: userId,
            workflowStatus: { in: ['DRAFT', 'PENDING_APPROVAL'] },
          },
        }),
      ]);

    // Stats from all courses
    const totalSales = allCourses.reduce(
      (sum, c) => sum + c.enrolledCourses.length,
      0,
    );
    const totalStudents = allCourses.reduce(
      (sum, c) => sum + c.enrolledCourses.length,
      0,
    );
    const avgRating =
      allCourses.length > 0
        ? allCourses.reduce((sum, c) => {
            const rating =
              c.reviews.length > 0
                ? c.reviews.reduce((rSum, r) => rSum + r.rating, 0) /
                  c.reviews.length
                : 0;
            return sum + rating;
          }, 0) / allCourses.length
        : 0;

    // Real AI suggestions: popular categories without instructor's
    const aiSuggestions = await this.getAiCourseSuggestions(userId);

    return {
      totalRevenue,
      platformFee: totalRevenue * 0.2,
      netRevenue: totalRevenue * 0.8,
      totalSales,
      totalCourses,
      totalPublishedCourses,
      totalStudents,
      avgRating: Math.round(avgRating * 10) / 10,
      courses: allCourses.map((course) => ({
        courseId: course.id,
        courseName: course.courseName,
        sales: course.enrolledCourses.length,
        revenue: course.enrolledCourses.length * Number(course.price || 0),
        students: course.enrolledCourses.length,
        rating:
          course.reviews.length > 0
            ? course.reviews.reduce((sum, r) => sum + r.rating, 0) /
              course.reviews.length
            : 0,
        category: course.categoryRecord?.name,
      })),
      recentCourses,
      recentStudents,
      aiSuggestions,
      pendingCourses,
    };
  }

  async getInstructorCourses(userId: string) {
    return this.prisma.course.findMany({
      where: { instructorId: userId },
      include: {
        instructor: { select: { fullname: true } },
        categoryRecord: true,
        courseDetails: true,
        _count: { select: { enrolledCourses: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourseAnalytics(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrolledCourses: { include: { user: true } },
        reviews: true,
        courseDetails: true,
        lessons: { select: { published: true } },
      },
    });

    if (!course) throw new Error('Course not found');

    const enrollmentsByDate = await this.prisma.enrolledCourse.groupBy({
      by: ['id'],
      where: { courseId },
      _count: { id: true },
    });

    return {
      ...course,
      enrollmentChart: enrollmentsByDate,
      avgCompletion: calculateAverageCompletion(course.lessons),
    };
  }

  generateCourseOutlineAI(
    category: string,
    difficulty: string,
    targetAudience: string,
  ) {
    // Mock Gemini AI response (replace with real API later)
    const mockPrompt = `Generate course outline for ${category}, ${difficulty}, target: ${targetAudience}`;

    // Simulate AI response based on task prompt
    return {
      title: 'AI Generated Course: ' + category,
      description: 'Generated by AI Assistant',
      lessons: [
        { title: 'Introduction', order: 1, durationMin: 15 },
        { title: 'Core Concepts', order: 2, durationMin: 30 },
        { title: 'Hands-on Practice', order: 3, durationMin: 45 },
        { title: 'Advanced Topics', order: 4, durationMin: 60 },
        { title: 'Final Project', order: 5, durationMin: 90 },
      ],
      quizzes: [
        {
          question: 'What is the main concept?',
          choices: ['A', 'B', 'C'],
          answer: 'A',
        },
      ],
      sourceType: 'AI_GENERATED' as const,
      themeKey: 'AI_TECH',
    };
  }

  async createLesson(
    courseId: string,
    data: { title: string; content: string; videoUrl?: string; order: number },
  ) {
    return this.prisma.courseLesson.create({
      data: {
        courseId,
        title: { th: data.title },
        summary: { th: data.content.substring(0, 200) + '...' },
        instructorScript: data.content,
        durationMinutes: data.videoUrl ? 10 : 5, // estimate
        order: data.order,
        published: false,
      },
    });
  }

  async createCourse(dto: CreateCourseDto, instructorId: string) {
    const slug = dto.courseName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-ก-๙]/g, '');

    return this.prisma.course.create({
      data: {
        courseName: dto.courseName,
        shortDescription:
          dto.shortDescription ?? dto.description.substring(0, 160),
        description: dto.description,
        category: dto.category,
        level: dto.level,
        price: dto.price ?? 0,
        videoPreview: dto.videoPreview,
        coverImage: dto.coverImage,
        thumbnail: dto.coverImage ?? '',
        targetAudience: dto.targetAudience ?? [],
        requirements: dto.requirements ?? [],
        willLearnMessages: dto.willLearnMessages ?? [],
        tags: dto.tags ?? [],
        instructorId,
        workflowStatus: 'DRAFT',
        status: 'DRAFT',
        slug,
      },
    });
  }

  async updateCourse(
    courseId: string,
    dto: CreateCourseDto,
    instructorId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructorId,
      },
    });

    if (!course) {
      throw new Error('Course not found or access denied');
    }

    const slug = dto.courseName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-ก-๙]/g, '');

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        courseName: dto.courseName,
        shortDescription:
          dto.shortDescription ?? dto.description.substring(0, 160),
        description: dto.description,
        category: dto.category,
        level: dto.level,
        price: dto.price ?? 0,
        videoPreview: dto.videoPreview,
        coverImage: dto.coverImage,
        thumbnail: dto.coverImage ?? course.thumbnail,
        targetAudience: dto.targetAudience ?? [],
        requirements: dto.requirements ?? [],
        willLearnMessages: dto.willLearnMessages ?? [],
        tags: dto.tags ?? [],
        slug,
      },
    });
  }

  async submitForReview(courseId: string, notes: string, instructorId: string) {
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        workflowStatus: 'PENDING_APPROVAL',
        approvalRequestedAt: new Date(),
        lastSubmittedAt: new Date(),
        revisionNotes: notes,
      },
    });

    const reviewRequest = await this.prisma.pendingCourseReview.create({
      data: {
        courseId: courseId,
        instructorId,
        instructorNotes: notes,
        status: 'PENDING_APPROVAL',
        submissionReason: 'Instructor submitted for admin review',
        version: (course.currentVersion ?? 0) + 1,
        lastSubmittedAt: new Date(),
      },
    });

    return reviewRequest;
  }

  private async getAiCourseSuggestions(userId: string) {
    const popularCourses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        instructorId: { not: userId },
      },
      select: {
        category: true,
        enrolledCourses: {
          select: {
            id: true,
          },
        },
      },
    });

    const currentTheme = await this.prisma.seasonalTheme.findFirst({
      where: { active: true },
      select: { key: true },
    });

    return buildAiSuggestions(
      summarizePopularCategories(popularCourses),
      currentTheme?.key,
    );
  }
}
