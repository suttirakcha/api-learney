import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AiDraftStatus,
  AiJobType,
  AssessmentKind,
  AttemptSourceType,
  CourseSourceType,
  CourseWorkflowStatus,
  DiscussionType,
  ModerationStatus,
  Prisma,
  PromotionType,
  SeasonalThemeKey,
  Status,
} from '../database/generated/prisma/client';
import {
  AdminConsoleActionDto,
  CatalogQueryDto,
  CreateReplyDto,
  CreateSkillAttemptDto,
  CreateThreadDto,
  ReportContentDto,
} from './dtos/experience.dto';
import { AiContentService } from './ai-content.service';

type LocalizedRecord = {
  th?: string;
  en?: string;
};

const publicCourseVisibility: Prisma.CourseWhereInput = {
  OR: [
    { isPublished: true },
    {
      workflowStatus: {
        in: [CourseWorkflowStatus.APPROVED, CourseWorkflowStatus.PUBLISHED],
      },
    },
    { status: Status.ACTIVE },
  ],
};

const skillCategories = [
  'Creativity',
  'Leadership',
  'Helping Others',
  'Analysis',
  'Communication',
  'Teamwork',
];

@Injectable()
export class ExperienceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiContentService: AiContentService,
  ) {}

  private parseLocalized(value: unknown, fallback?: string): LocalizedRecord {
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return {
        th: typeof record.th === 'string' ? record.th : fallback,
        en: typeof record.en === 'string' ? record.en : fallback,
      };
    }

    if (typeof value === 'string') {
      return { th: value, en: value };
    }

    return { th: fallback, en: fallback };
  }

  private toNumber(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private getInstructorSummary(course: {
    displayInstructor: null | {
      id: string;
      displayName: string;
      image: string | null;
      bio: unknown;
      headline: unknown;
      visible: boolean;
    };
    instructor: {
      id: string;
      fullname: string;
      image: string | null;
    };
  }) {
    if (course.displayInstructor?.visible !== false) {
      return {
        id: course.displayInstructor?.id ?? course.instructor.id,
        name:
          course.displayInstructor?.displayName ?? course.instructor.fullname,
        image: course.displayInstructor?.image ?? course.instructor.image,
        bio: this.parseLocalized(course.displayInstructor?.bio, ''),
        headline: this.parseLocalized(course.displayInstructor?.headline, ''),
      };
    }

    return {
      id: course.instructor.id,
      name: course.instructor.fullname,
      image: course.instructor.image,
      bio: this.parseLocalized('', ''),
      headline: this.parseLocalized('', ''),
    };
  }

  private courseToCard(course: {
    id: string;
    slug: string | null;
    courseName: string;
    title: unknown;
    shortDescription: unknown;
    localizedDescription: unknown;
    description: string;
    category: string;
    level: string | null;
    badge: string | null;
    thumbnail: string;
    coverImage: string | null;
    previewThumbnail: string | null;
    price: unknown;
    discountPrice: unknown;
    averageRating: unknown;
    reviewCount: number;
    learnerCount: number;
    isPopular: boolean;
    isFeatured: boolean;
    workflowStatus: CourseWorkflowStatus;
    sourceType: CourseSourceType;
    promotions?: Array<{
      promotion: {
        active: boolean;
        title: unknown;
        type: PromotionType;
        discount: number | null;
        promoCode: string | null;
      };
    }>;
    categoryRecord?: {
      key: string;
      slug: string;
      name: unknown;
      color: string | null;
    } | null;
    displayInstructor: null | {
      id: string;
      displayName: string;
      image: string | null;
      bio: unknown;
      headline: unknown;
      visible: boolean;
    };
    instructor: {
      id: string;
      fullname: string;
      image: string | null;
    };
  }) {
    const activePromotion = course.promotions?.find(
      (entry) => entry.promotion.active,
    )?.promotion;

    return {
      id: course.id,
      slug: course.slug ?? course.id,
      title: this.parseLocalized(course.title, course.courseName),
      shortDescription: this.parseLocalized(
        course.shortDescription,
        course.description,
      ),
      description: this.parseLocalized(
        course.localizedDescription,
        course.description,
      ),
      category: course.categoryRecord
        ? {
            key: course.categoryRecord.key,
            slug: course.categoryRecord.slug,
            name: this.parseLocalized(
              course.categoryRecord.name,
              course.category,
            ),
            color: course.categoryRecord.color,
          }
        : {
            key: this.slugify(course.category),
            slug: this.slugify(course.category),
            name: this.parseLocalized(course.category, course.category),
            color: null,
          },
      instructor: this.getInstructorSummary(course),
      level: course.level,
      badge: course.badge,
      coverImage: course.coverImage ?? course.thumbnail,
      previewThumbnail:
        course.previewThumbnail ?? course.coverImage ?? course.thumbnail,
      rating: this.toNumber(course.averageRating),
      reviewCount: course.reviewCount,
      learners: course.learnerCount,
      price: this.toNumber(course.price),
      discountPrice: course.discountPrice
        ? this.toNumber(course.discountPrice)
        : null,
      hasPromotion: Boolean(activePromotion),
      promotion: activePromotion
        ? {
            title: this.parseLocalized(activePromotion.title, 'Promotion'),
            type: activePromotion.type,
            discount: activePromotion.discount,
            promoCode: activePromotion.promoCode,
          }
        : null,
      workflowStatus: course.workflowStatus,
      sourceType: course.sourceType,
      isPopular: course.isPopular,
      isFeatured: course.isFeatured,
    };
  }

  private async getActiveTheme() {
    return this.prisma.seasonalTheme.findFirst({
      where: {
        OR: [{ active: true }, { previewMode: true }],
      },
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getBootstrap() {
    const [activeTheme, categories] = await Promise.all([
      this.getActiveTheme(),
      this.prisma.category.findMany({
        where: { visible: true },
        orderBy: { order: 'asc' },
        select: {
          key: true,
          slug: true,
          name: true,
          color: true,
          icon: true,
        },
      }),
    ]);

    return {
      activeTheme: activeTheme
        ? {
            key: activeTheme.key,
            name: this.parseLocalized(activeTheme.name, 'Theme'),
            assets: activeTheme.assets,
            previewMode: activeTheme.previewMode,
          }
        : null,
      categories: categories.map((category) => ({
        ...category,
        name: this.parseLocalized(category.name, category.key),
      })),
    };
  }

  async getHomePage() {
    const [
      featured,
      popularCourses,
      categories,
      reviews,
      promotions,
      activeTheme,
    ] = await Promise.all([
      this.prisma.homepageFeaturedCourse.findMany({
        orderBy: { rank: 'asc' },
        include: {
          course: {
            include: {
              categoryRecord: true,
              displayInstructor: true,
              instructor: {
                select: {
                  id: true,
                  fullname: true,
                  image: true,
                },
              },
              promotions: {
                include: {
                  promotion: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.course.findMany({
        where: {
          ...publicCourseVisibility,
          isPopular: true,
        },
        orderBy: [{ learnerCount: 'desc' }, { averageRating: 'desc' }],
        take: 6,
        include: {
          categoryRecord: true,
          displayInstructor: true,
          instructor: {
            select: {
              id: true,
              fullname: true,
              image: true,
            },
          },
          promotions: {
            include: {
              promotion: true,
            },
          },
        },
      }),
      this.prisma.category.findMany({
        where: { visible: true },
        orderBy: { order: 'asc' },
      }),
      this.prisma.review.findMany({
        where: {
          visible: true,
          moderationStatus: ModerationStatus.VISIBLE,
        },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: 4,
        include: {
          course: {
            select: {
              slug: true,
              courseName: true,
              title: true,
            },
          },
          user: {
            select: {
              fullname: true,
              image: true,
            },
          },
        },
      }),
      this.prisma.promotion.findMany({
        where: { active: true },
        orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
        take: 4,
      }),
      this.getActiveTheme(),
    ]);

    const [userCount, courseCount, instructorCount, ratingAggregate] =
      await Promise.all([
        this.prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
        this.prisma.course.count({ where: publicCourseVisibility }),
        this.prisma.instructorProfile.count({ where: { visible: true } }),
        this.prisma.review.aggregate({
          where: { visible: true },
          _avg: { rating: true },
        }),
      ]);

    const audienceSections = [
      {
        key: 'ai-for-work',
        title: this.parseLocalized('AI for Work', 'AI for Work'),
        description: this.parseLocalized(
          'อัปสกิลงานประจำให้เร็วขึ้น ชัดขึ้น และเหนื่อยน้อยลง',
          'Upgrade daily work with clearer, faster workflows.',
        ),
        courseSlugs: [
          'ai-work-automation-bootcamp',
          'career-communication-confidence',
        ],
      },
      {
        key: 'ai-for-business',
        title: this.parseLocalized('AI for Business', 'AI for Business'),
        description: this.parseLocalized(
          'ใช้ AI ช่วยคิด วางแผน และขยายธุรกิจอย่างมีระบบ',
          'Use AI to plan, operate, and scale with better systems.',
        ),
        courseSlugs: ['founder-ai-playbook', 'ai-team-leadership-draft'],
      },
      {
        key: 'ai-for-creators',
        title: this.parseLocalized('AI for Creators', 'AI for Creators'),
        description: this.parseLocalized(
          'สร้างคอนเทนต์คุณภาพสูงแบบยังคงตัวตนของคุณ',
          'Create better content while keeping your voice intact.',
        ),
        courseSlugs: ['creator-ai-content-studio', 'ai-marketing-strategy-lab'],
      },
      {
        key: 'ai-for-students',
        title: this.parseLocalized('AI for Students', 'AI for Students'),
        description: this.parseLocalized(
          'สร้างทักษะสำหรับอนาคตด้วยการเรียนที่เป็นมิตรและใช้ได้จริง',
          'Build future-ready skills with warm, practical learning.',
        ),
        courseSlugs: [
          'english-for-global-ai-teams',
          'career-communication-confidence',
        ],
      },
    ];

    const cardLookup = new Map(
      popularCourses.map((course) => [course.slug, this.courseToCard(course)]),
    );

    return {
      hero: {
        title: this.parseLocalized(
          'เติบโตทักษะ AI ให้พร้อมสำหรับยุคดิจิทัล',
          'Grow your AI skills for the digital era',
        ),
        subtitle: this.parseLocalized(
          'คอร์สที่อบอุ่น ใช้งานได้จริง และออกแบบมาให้คุณก้าวไปข้างหน้าอย่างมั่นใจ',
          'Warm, practical courses designed to help you move forward with confidence.',
        ),
        ctas: [
          {
            label: this.parseLocalized('สำรวจคอร์ส', 'Explore Courses'),
            href: '/courses',
          },
          {
            label: this.parseLocalized('ทำแบบทดสอบทักษะ', 'Take Skill Test'),
            href: '/skill-test',
          },
          {
            label: this.parseLocalized(
              'ดูคอร์สยอดนิยม',
              'View Popular Courses',
            ),
            href: '/courses?sort=most-popular',
          },
        ],
      },
      categories: categories.map((category) => ({
        key: category.key,
        slug: category.slug,
        name: this.parseLocalized(category.name, category.key),
        icon: category.icon,
        color: category.color,
      })),
      audienceSections: audienceSections.map((section) => ({
        ...section,
        courses: section.courseSlugs
          .map((slug) => cardLookup.get(slug))
          .filter(Boolean),
      })),
      featuredCourses: featured.map((item) => ({
        rank: item.rank,
        badge: item.badge,
        course: this.courseToCard(item.course),
      })),
      popularCourses: popularCourses.map((course) => this.courseToCard(course)),
      promotions: promotions.map((promotion) => ({
        id: promotion.id,
        slug: promotion.slug,
        title: this.parseLocalized(promotion.title, 'Promotion'),
        description: this.parseLocalized(promotion.description, ''),
        type: promotion.type,
        banner: promotion.banner,
        discount: promotion.discount,
        promoCode: promotion.promoCode,
        startDate: promotion.startDate.toISOString(),
        endDate: promotion.endDate.toISOString(),
      })),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        author: review.user?.fullname ?? 'Learney member',
        avatar: review.user?.image,
        course: {
          slug: review.course.slug,
          title: this.parseLocalized(
            review.course.title,
            review.course.courseName,
          ),
        },
      })),
      socialProof: {
        students: userCount.toLocaleString(),
        instructors: instructorCount.toLocaleString(),
        courses: courseCount.toLocaleString(),
        rating: (ratingAggregate._avg.rating ?? 4.8).toFixed(1),
      },
      benefits: [
        this.parseLocalized(
          'หลักสูตรคัดมาแล้วสำหรับอนาคตสาย AI',
          'Curated AI-era curriculum',
        ),
        this.parseLocalized(
          'มีแบบทดสอบก่อน-หลังเรียนให้เห็นพัฒนาการ',
          'See your progress with pre/post assessment',
        ),
        this.parseLocalized(
          'ชุมชนถามตอบที่อ่านง่ายและเป็นมิตร',
          'A warm, readable community',
        ),
      ],
      activeTheme: activeTheme
        ? {
            key: activeTheme.key,
            name: this.parseLocalized(activeTheme.name, 'Theme'),
            assets: activeTheme.assets,
          }
        : null,
    };
  }

  async getCatalog(query: CatalogQueryDto) {
    const page = Math.max(1, Number(query.page ?? '1') || 1);
    const courses = await this.prisma.course.findMany({
      where: publicCourseVisibility,
      include: {
        categoryRecord: true,
        displayInstructor: true,
        instructor: {
          select: {
            id: true,
            fullname: true,
            image: true,
          },
        },
        promotions: {
          include: {
            promotion: true,
          },
        },
      },
    });

    const filtered = courses
      .filter((course) => {
        const search = query.search?.trim().toLowerCase();
        if (search) {
          const haystack = [
            course.courseName,
            course.category,
            ...(course.tags ?? []),
          ]
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(search)) {
            return false;
          }
        }

        if (query.category) {
          const categoryKey =
            course.categoryRecord?.slug ?? this.slugify(course.category);
          if (query.category !== categoryKey) {
            return false;
          }
        }

        if (
          query.level &&
          query.level !== 'all' &&
          course.level !== query.level
        ) {
          return false;
        }

        if (query.promotion === 'true') {
          const hasPromotion = course.promotions.some(
            (entry) => entry.promotion.active,
          );
          if (!hasPromotion) {
            return false;
          }
        }

        if (query.rating) {
          const threshold = Number(query.rating);
          if (this.toNumber(course.averageRating) < threshold) {
            return false;
          }
        }

        if (query.price) {
          const actualPrice = this.toNumber(
            course.discountPrice ?? course.price,
          );
          if (query.price === 'under-5000' && actualPrice >= 5000) {
            return false;
          }
          if (
            query.price === '5000-8000' &&
            (actualPrice < 5000 || actualPrice > 8000)
          ) {
            return false;
          }
          if (query.price === 'over-8000' && actualPrice <= 8000) {
            return false;
          }
        }

        if (query.instructor) {
          const instructorName =
            this.getInstructorSummary(course).name.toLowerCase();
          if (!instructorName.includes(query.instructor.toLowerCase())) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (query.sort) {
          case 'newest':
            return b.createdAt.getTime() - a.createdAt.getTime();
          case 'highest-rated':
            return (
              this.toNumber(b.averageRating) - this.toNumber(a.averageRating)
            );
          case 'price-low-to-high':
            return (
              this.toNumber(a.discountPrice ?? a.price) -
              this.toNumber(b.discountPrice ?? b.price)
            );
          case 'price-high-to-low':
            return (
              this.toNumber(b.discountPrice ?? b.price) -
              this.toNumber(a.discountPrice ?? a.price)
            );
          case 'most-popular':
          default:
            return b.learnerCount - a.learnerCount;
        }
      });

    const pageSize = 9;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    return {
      items: pageItems.map((course) => this.courseToCard(course)),
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      filters: {
        categories: Array.from(
          new Map(
            courses
              .filter((course) => course.categoryRecord)
              .map((course) => [
                course.categoryRecord!.slug,
                {
                  value: course.categoryRecord!.slug,
                  label: this.parseLocalized(
                    course.categoryRecord!.name,
                    course.category,
                  ),
                },
              ]),
          ).values(),
        ),
        levels: ['Beginner', 'Intermediate', 'Advanced'],
        ratings: ['4', '4.5'],
        priceRanges: ['under-5000', '5000-8000', 'over-8000'],
        sortOptions: [
          'most-popular',
          'newest',
          'highest-rated',
          'price-low-to-high',
          'price-high-to-low',
        ],
      },
      activeFilters: query,
    };
  }

  async getCourseDetail(slugOrId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        categoryRecord: true,
        displayInstructor: true,
        instructor: {
          select: {
            id: true,
            fullname: true,
            image: true,
          },
        },
        reviews: {
          where: {
            visible: true,
            moderationStatus: ModerationStatus.VISIBLE,
          },
          include: {
            user: {
              select: {
                fullname: true,
                image: true,
              },
            },
          },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          take: 6,
        },
        communityThreads: {
          where: {
            visible: true,
            moderationStatus: ModerationStatus.VISIBLE,
          },
          include: {
            user: {
              select: {
                fullname: true,
                role: true,
              },
            },
            replies: {
              where: { visible: true },
              include: {
                user: {
                  select: {
                    fullname: true,
                    role: true,
                  },
                },
              },
              take: 2,
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          take: 3,
        },
        promotions: {
          include: {
            promotion: true,
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                assets: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        courseAssessments: {
          where: { active: true },
          orderBy: { createdAt: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const relatedCourses = await this.prisma.course.findMany({
      where: {
        ...publicCourseVisibility,
        id: { not: course.id },
        OR: [
          course.categoryId ? { categoryId: course.categoryId } : {},
          { category: course.category },
        ],
      },
      take: 3,
      include: {
        categoryRecord: true,
        displayInstructor: true,
        instructor: {
          select: {
            id: true,
            fullname: true,
            image: true,
          },
        },
        promotions: {
          include: {
            promotion: true,
          },
        },
      },
    });

    return {
      course: {
        ...this.courseToCard(course),
        duration: course.duration,
        previewVideoUrl: course.previewVideoUrl ?? course.videoPreview,
        previewThumbnail: course.previewThumbnail ?? course.thumbnail,
        willLearnMessages: course.willLearnMessages,
        requirements: course.requirements,
        badges: [
          course.badge,
          course.isPopular ? 'Popular' : null,
          course.isFeatured ? 'Recommended' : null,
        ].filter(Boolean),
        modules: course.modules.map((module) => ({
          id: module.id,
          title: this.parseLocalized(module.title, 'Module'),
          summary: this.parseLocalized(module.summary, ''),
          order: module.order,
          lessons: module.lessons.map((lesson) => ({
            id: lesson.id,
            order: lesson.order,
            title: this.parseLocalized(lesson.title, 'Lesson'),
            summary: this.parseLocalized(lesson.summary, ''),
            keyTakeaways: Array.isArray(lesson.keyTakeaways)
              ? (lesson.keyTakeaways as string[])
              : [],
            assets: lesson.assets.map((asset) => ({
              id: asset.id,
              kind: asset.kind,
              title: this.parseLocalized(asset.title, asset.kind),
            })),
          })),
        })),
        assessments: course.courseAssessments.map((assessment) => ({
          id: assessment.id,
          kind: assessment.kind,
          title: this.parseLocalized(assessment.title, 'Assessment'),
          description: this.parseLocalized(assessment.description, ''),
          questionCount: assessment.questions.length,
        })),
      },
      reviews: course.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        author: review.user?.fullname ?? 'Learney member',
        avatar: review.user?.image,
      })),
      discussionPreview: course.communityThreads.map((thread) => ({
        id: thread.id,
        title: this.parseLocalized(thread.title, 'Discussion'),
        content: this.parseLocalized(thread.content, ''),
        type: thread.type,
        pinned: thread.pinned,
        author: thread.user.fullname,
        role: thread.user.role,
        replies: thread.replies.map((reply) => ({
          id: reply.id,
          content: this.parseLocalized(reply.content, ''),
          author: reply.user.fullname,
          role: reply.user.role,
        })),
      })),
      relatedCourses: relatedCourses.map((item) => this.courseToCard(item)),
    };
  }

  async getCommunity(courseId?: string) {
    const threads = await this.prisma.communityThread.findMany({
      where: {
        visible: true,
        moderationStatus: ModerationStatus.VISIBLE,
        ...(courseId ? { courseId } : {}),
      },
      include: {
        user: {
          select: {
            fullname: true,
            role: true,
          },
        },
        course: {
          select: {
            slug: true,
            courseName: true,
            title: true,
          },
        },
        replies: {
          where: {
            visible: true,
            moderationStatus: ModerationStatus.VISIBLE,
          },
          include: {
            user: {
              select: {
                fullname: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      highlights: {
        totalThreads: threads.length,
        questions: threads.filter(
          (thread) => thread.type === DiscussionType.QUESTION,
        ).length,
        discussions: threads.filter(
          (thread) => thread.type === DiscussionType.DISCUSSION,
        ).length,
      },
      threads: threads.map((thread) => ({
        id: thread.id,
        type: thread.type,
        pinned: thread.pinned,
        title: this.parseLocalized(thread.title, 'Discussion'),
        content: this.parseLocalized(thread.content, ''),
        author: {
          name: thread.user.fullname,
          role: thread.user.role,
        },
        course: thread.course
          ? {
              slug: thread.course.slug,
              title: this.parseLocalized(
                thread.course.title,
                thread.course.courseName,
              ),
            }
          : null,
        replies: thread.replies.map((reply) => ({
          id: reply.id,
          content: this.parseLocalized(reply.content, ''),
          author: {
            name: reply.user.fullname,
            role: reply.user.role,
          },
        })),
      })),
    };
  }

  async createCommunityThread(userId: string, dto: CreateThreadDto) {
    return this.prisma.communityThread.create({
      data: {
        userId,
        courseId: dto.courseId,
        type:
          dto.type?.toUpperCase() === DiscussionType.QUESTION
            ? DiscussionType.QUESTION
            : DiscussionType.DISCUSSION,
        ...(dto.title ? { title: dto.title as Prisma.InputJsonValue } : {}),
        content: dto.content as Prisma.InputJsonValue,
        visible: true,
        moderationStatus: ModerationStatus.VISIBLE,
      },
    });
  }

  async createCommunityReply(
    userId: string,
    threadId: string,
    dto: CreateReplyDto,
  ) {
    const thread = await this.prisma.communityThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    return this.prisma.communityReply.create({
      data: {
        threadId,
        userId,
        content: dto.content,
        visible: true,
        moderationStatus: ModerationStatus.VISIBLE,
      },
    });
  }

  async reportCommunityContent(userId: string, dto: ReportContentDto) {
    if (!dto.threadId && !dto.replyId) {
      throw new BadRequestException('threadId or replyId is required');
    }

    const report = await this.prisma.communityReport.create({
      data: {
        userId,
        threadId: dto.threadId,
        replyId: dto.replyId,
        reason: dto.reason,
      },
    });

    if (dto.threadId) {
      await this.prisma.communityThread.update({
        where: { id: dto.threadId },
        data: {
          reportCount: { increment: 1 },
          moderationStatus: ModerationStatus.FLAGGED,
        },
      });
    }

    if (dto.replyId) {
      await this.prisma.communityReply.update({
        where: { id: dto.replyId },
        data: {
          reportCount: { increment: 1 },
          moderationStatus: ModerationStatus.FLAGGED,
        },
      });
    }

    return report;
  }

  async getPromotionsPage() {
    const [promotions, activeTheme, featuredCourses] = await Promise.all([
      this.prisma.promotion.findMany({
        include: {
          courses: {
            include: {
              course: {
                include: {
                  categoryRecord: true,
                  displayInstructor: true,
                  instructor: {
                    select: {
                      id: true,
                      fullname: true,
                      image: true,
                    },
                  },
                  promotions: {
                    include: {
                      promotion: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ active: 'desc' }, { endDate: 'asc' }],
      }),
      this.getActiveTheme(),
      this.prisma.homepageFeaturedCourse.findMany({
        include: {
          course: {
            include: {
              categoryRecord: true,
              displayInstructor: true,
              instructor: {
                select: {
                  id: true,
                  fullname: true,
                  image: true,
                },
              },
              promotions: {
                include: { promotion: true },
              },
            },
          },
        },
        orderBy: { rank: 'asc' },
      }),
    ]);

    return {
      activeTheme: activeTheme
        ? {
            key: activeTheme.key,
            name: this.parseLocalized(activeTheme.name, 'Theme'),
            assets: activeTheme.assets,
          }
        : null,
      promotions: promotions.map((promotion) => ({
        id: promotion.id,
        slug: promotion.slug,
        title: this.parseLocalized(promotion.title, 'Promotion'),
        description: this.parseLocalized(promotion.description, ''),
        type: promotion.type,
        banner: promotion.banner,
        discount: promotion.discount,
        promoCode: promotion.promoCode,
        active: promotion.active,
        themeKey: promotion.themeKey,
        courses: promotion.courses.map((entry) =>
          this.courseToCard(entry.course),
        ),
      })),
      featuredCampaigns: featuredCourses.map((entry) => ({
        rank: entry.rank,
        badge: entry.badge,
        course: this.courseToCard(entry.course),
      })),
    };
  }

  async getSkillTestIntro(ageGroup?: string) {
    const [tests, userCount, careers] = await Promise.all([
      this.prisma.skillTest.findMany({
        where: ageGroup ? { ageGroup } : undefined,
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count(),
      this.prisma.career.count(),
    ]);

    const selectedTest = ageGroup
      ? (tests.find((test) => test.ageGroup === ageGroup) ?? tests[0])
      : null;

    return {
      intro: {
        title: this.parseLocalized(
          'คุณอาจเก่งมากกว่าที่คิด',
          'You might be more capable than you think',
        ),
        subtitle: this.parseLocalized(
          'มองเห็นจุดแข็ง เส้นทางอาชีพ และคอร์สที่เหมาะกับคุณ',
          'Discover strengths, future-fit careers, and courses that match you.',
        ),
        stats: [
          { label: 'users', value: `${userCount.toLocaleString()}+` },
          { label: 'careers', value: `${careers.toLocaleString()}+` },
          {
            label: 'courses',
            value: `${(await this.prisma.course.count({ where: publicCourseVisibility })).toLocaleString()}+`,
          },
        ],
      },
      ageGroups: tests.map((test) => ({
        id: test.id,
        slug: test.slug,
        ageGroup: test.ageGroup,
        title: this.parseLocalized(test.title, test.ageGroup),
        intro: this.parseLocalized(test.intro, ''),
      })),
      questionSet: selectedTest
        ? {
            id: selectedTest.id,
            ageGroup: selectedTest.ageGroup,
            title: this.parseLocalized(
              selectedTest.title,
              selectedTest.ageGroup,
            ),
            questions: selectedTest.questions.map((question) => ({
              id: question.id,
              category: question.category,
              prompt: this.parseLocalized(question.prompt, question.category),
              scale: [1, 2, 3, 4, 5],
            })),
          }
        : null,
    };
  }

  async createSkillTestAttempt(
    userId: string | null,
    dto: CreateSkillAttemptDto,
  ) {
    const test = await this.prisma.skillTest.findFirst({
      where: { ageGroup: dto.ageGroup },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Skill test not found');
    }

    if (!dto.answers.length) {
      throw new BadRequestException('Answers are required');
    }

    const scoresByCategory = new Map<string, number[]>();
    dto.answers.forEach((answer) => {
      const numericValue = Math.min(5, Math.max(1, Number(answer.value) || 0));
      const existing = scoresByCategory.get(answer.category) ?? [];
      existing.push(numericValue * 20);
      scoresByCategory.set(answer.category, existing);
    });

    const normalizedScores = Array.from(scoresByCategory.entries()).map(
      ([category, values]) => ({
        category,
        score: Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        ),
      }),
    );

    const topCategories = [...normalizedScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const careerRules = await this.prisma.careerRule.findMany({
      where: {
        OR: [{ ageGroup: dto.ageGroup }, { ageGroup: null }],
      },
      include: {
        career: true,
      },
    });

    const careerScores = new Map<string, number>();
    careerRules.forEach((rule) => {
      const categoryScore =
        normalizedScores.find((score) => score.category === rule.skillCategory)
          ?.score ?? 0;

      if (categoryScore >= rule.threshold) {
        careerScores.set(
          rule.careerId,
          (careerScores.get(rule.careerId) ?? 0) + rule.weight * categoryScore,
        );
      }
    });

    const topCareerIds = [...careerScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([careerId]) => careerId);

    const summary = this.parseLocalized(
      {
        th: `จุดแข็งเด่นของคุณคือ ${topCategories
          .map((item) => item.category)
          .join(', ')} และทั้งหมดนี้ยังพัฒนาได้อีกมาก`,
        en: `Your strongest areas are ${topCategories
          .map((item) => item.category)
          .join(', ')}, and each one can keep growing with practice.`,
      },
      '',
    );

    const attempt = await this.prisma.skillTestAttempt.create({
      data: {
        skillTestId: test.id,
        userId,
        guestToken: userId ? null : `guest-${Date.now()}`,
        courseId: dto.courseId,
        ageGroup: dto.ageGroup,
        sourceType:
          dto.sourceType === 'COURSE_ASSESSMENT'
            ? AttemptSourceType.COURSE_ASSESSMENT
            : AttemptSourceType.DISCOVERY,
        assessmentKind:
          dto.assessmentKind === 'POST_TEST'
            ? AssessmentKind.POST_TEST
            : dto.assessmentKind === 'PRE_TEST'
              ? AssessmentKind.PRE_TEST
              : AssessmentKind.DISCOVERY,
        answers: dto.answers as unknown as Prisma.InputJsonValue,
        summary,
        topCareerIds,
      },
    });

    if (normalizedScores.length) {
      await this.prisma.skillTestScore.createMany({
        data: normalizedScores.map((score) => ({
          attemptId: attempt.id,
          category: score.category,
          score: score.score,
        })),
      });
    }

    return {
      attemptId: attempt.id,
      resultPath: `/skill-test/result/${attempt.id}`,
      careersPath: `/skill-test/careers/${attempt.id}`,
      coursesPath: `/skill-test/courses/${attempt.id}`,
    };
  }

  private async getCareerMatchesForAttempt(attemptId: string) {
    const attempt = await this.prisma.skillTestAttempt.findUnique({
      where: { id: attemptId },
      include: {
        scores: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    const careers = await this.prisma.career.findMany({
      where: {
        id: {
          in: attempt.topCareerIds,
        },
      },
      include: {
        rules: true,
      },
    });

    const careerMatches = careers.map((career, index) => {
      const score = career.rules.reduce((total, rule) => {
        const categoryScore =
          attempt.scores.find((item) => item.category === rule.skillCategory)
            ?.score ?? 0;
        return (
          total +
          (categoryScore >= rule.threshold ? rule.weight * categoryScore : 0)
        );
      }, 0);

      return {
        id: career.id,
        slug: career.slug,
        name: this.parseLocalized(career.name, career.slug),
        summary: this.parseLocalized(career.summary, ''),
        image: career.image,
        salaryRange: career.salaryRange,
        requiredSkills: career.requiredSkills,
        matchPercentage: Math.max(
          62,
          Math.min(98, score > 0 ? Math.round(score / 3) : 85 - index * 5),
        ),
      };
    });

    return { attempt, careerMatches };
  }

  async getSkillTestAttemptResult(attemptId: string) {
    const attempt = await this.prisma.skillTestAttempt.findUnique({
      where: { id: attemptId },
      include: {
        scores: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    return {
      attemptId: attempt.id,
      ageGroup: attempt.ageGroup,
      summary: this.parseLocalized(attempt.summary, ''),
      chart: attempt.scores.map((score) => ({
        category: score.category,
        score: score.score,
      })),
    };
  }

  async getCareerRecommendations(attemptId: string) {
    const { careerMatches } = await this.getCareerMatchesForAttempt(attemptId);
    return careerMatches.slice(0, 6);
  }

  async getRecommendedCourses(attemptId: string) {
    const { attempt, careerMatches } =
      await this.getCareerMatchesForAttempt(attemptId);
    const careers = await this.prisma.career.findMany({
      where: { id: { in: careerMatches.map((career) => career.id) } },
      include: { rules: true },
    });

    const recommendedCourseIds = new Set<string>();
    careers.forEach((career) =>
      career.rules.forEach((rule) =>
        rule.recommendedCourseIds.forEach((courseId) =>
          recommendedCourseIds.add(courseId),
        ),
      ),
    );

    const courses = await this.prisma.course.findMany({
      where: {
        id: { in: [...recommendedCourseIds] },
      },
      include: {
        categoryRecord: true,
        displayInstructor: true,
        instructor: {
          select: {
            id: true,
            fullname: true,
            image: true,
          },
        },
        promotions: {
          include: {
            promotion: true,
          },
        },
      },
    });

    return courses.map((course, index) => ({
      ...this.courseToCard(course),
      matchPercentage: Math.max(
        70,
        96 -
          index * 4 +
          Math.round(
            (attempt.scores[index % Math.max(attempt.scores.length, 1)]
              ?.score ?? 80) / 20,
          ),
      ),
    }));
  }

  async getDashboard(userId: string) {
    const [user, wishlist, enrolledCourses, attempts, communityCount] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            fullname: true,
            role: true,
            image: true,
          },
        }),
        this.prisma.wishlist.findUnique({
          where: { userId },
          include: { items: true },
        }),
        this.prisma.enrolledCourse.findMany({
          where: { userId },
          include: {
            course: {
              include: {
                categoryRecord: true,
                displayInstructor: true,
                instructor: {
                  select: {
                    id: true,
                    fullname: true,
                    image: true,
                  },
                },
                promotions: {
                  include: { promotion: true },
                },
              },
            },
          },
        }),
        this.prisma.skillTestAttempt.findMany({
          where: { userId },
          include: { scores: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.communityThread.count({ where: { userId } }),
      ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const discoveryAttempts = attempts.filter(
      (attempt) => attempt.assessmentKind === AssessmentKind.DISCOVERY,
    );
    const preAttempt = attempts.find(
      (attempt) => attempt.assessmentKind === AssessmentKind.PRE_TEST,
    );
    const postAttempt = attempts.find(
      (attempt) => attempt.assessmentKind === AssessmentKind.POST_TEST,
    );

    const progressChart = skillCategories.map((category) => ({
      category,
      before:
        preAttempt?.scores.find((score) => score.category === category)
          ?.score ?? 0,
      after:
        postAttempt?.scores.find((score) => score.category === category)
          ?.score ??
        discoveryAttempts[0]?.scores.find(
          (score) => score.category === category,
        )?.score ??
        0,
    }));

    const streak = Math.max(
      3,
      Math.min(14, attempts.length * 2 + enrolledCourses.length),
    );
    const achievements = [
      {
        key: 'starter',
        label: 'Starter',
        unlocked: enrolledCourses.length > 0,
      },
      {
        key: 'explorer',
        label: 'Explorer',
        unlocked: discoveryAttempts.length > 0,
      },
      {
        key: 'consistent',
        label: 'Consistent',
        unlocked: streak >= 5,
      },
    ];

    return {
      greeting: {
        title: `Hello, ${user.fullname}`,
        subtitle: this.parseLocalized(
          'ก้าวต่อไปเล็กๆ ที่ทำได้ทุกวัน จะพาคุณไปไกลกว่าที่คิด',
          'Small consistent steps can carry you farther than you think.',
        ),
      },
      stats: {
        enrolledCourses: enrolledCourses.length,
        wishlistItems: wishlist?.items.length ?? 0,
        streak,
        communityPosts: communityCount,
      },
      learningGraph: progressChart,
      achievements,
      checklist: [
        {
          label: this.parseLocalized(
            'ทำแบบทดสอบค้นหาศักยภาพ',
            'Complete your discovery test',
          ),
          done: discoveryAttempts.length > 0,
        },
        {
          label: this.parseLocalized(
            'เริ่มเรียนคอร์สแรก',
            'Start your first course',
          ),
          done: enrolledCourses.length > 0,
        },
        {
          label: this.parseLocalized(
            'เปรียบเทียบผลก่อนและหลังเรียน',
            'Compare pre/post growth',
          ),
          done: Boolean(preAttempt && postAttempt),
        },
      ],
      recommendedNextSteps: [
        this.parseLocalized(
          'กลับไปอัปเดต wishlist และเลือกคอร์สลำดับถัดไป',
          'Refresh your wishlist and choose the next course.',
        ),
        this.parseLocalized(
          'อ่าน discussion ล่าสุดเพื่อเก็บ use case ใหม่',
          'Browse the latest discussions for new use cases.',
        ),
      ],
      enrolledCourses: enrolledCourses.map((item) =>
        this.courseToCard(item.course),
      ),
      recentDiscovery: discoveryAttempts[0]
        ? {
            id: discoveryAttempts[0].id,
            summary: this.parseLocalized(discoveryAttempts[0].summary, ''),
          }
        : null,
    };
  }

  async getWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            course: {
              include: {
                categoryRecord: true,
                displayInstructor: true,
                instructor: {
                  select: {
                    id: true,
                    fullname: true,
                    image: true,
                  },
                },
                promotions: {
                  include: { promotion: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return {
      items:
        wishlist?.items.map((item) => this.courseToCard(item.course)) ?? [],
    };
  }

  async toggleWishlist(userId: string, courseId: string, add: boolean) {
    const wishlist = await this.prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    if (add) {
      await this.prisma.wishlistItem.upsert({
        where: {
          wishlistCourseIdentifier: {
            wishlistId: wishlist.id,
            courseId,
          },
        },
        update: {},
        create: {
          wishlistId: wishlist.id,
          courseId,
        },
      });

      return { message: 'Added to wishlist' };
    }

    await this.prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        courseId,
      },
    });

    return { message: 'Removed from wishlist' };
  }

  async getAdminOverview() {
    const [
      totalUsers,
      totalInstructors,
      totalCourses,
      publishedCourses,
      popularCourses,
      latestReviews,
      activePromotion,
      activeTheme,
      aiQueueCount,
      revenue,
      communityReports,
      skillTestUsage,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      this.prisma.instructorProfile.count({ where: { visible: true } }),
      this.prisma.course.count(),
      this.prisma.course.count({ where: { isPublished: true } }),
      this.prisma.course.count({ where: { isPopular: true } }),
      this.prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          course: { select: { courseName: true, slug: true, title: true } },
          user: { select: { fullname: true } },
        },
      }),
      this.prisma.promotion.findFirst({
        where: { active: true },
        orderBy: { endDate: 'asc' },
      }),
      this.getActiveTheme(),
      this.prisma.aiDraft.count({
        where: {
          status: {
            in: [
              AiDraftStatus.AI_GENERATED,
              AiDraftStatus.ADMIN_REVIEW,
              AiDraftStatus.EDITED,
            ],
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.communityReport.count({ where: { resolved: false } }),
      this.prisma.skillTestAttempt.count(),
    ]);

    return {
      cards: [
        { label: 'total users', value: totalUsers },
        { label: 'total instructors', value: totalInstructors },
        { label: 'total courses', value: totalCourses },
        { label: 'published courses', value: publishedCourses },
        { label: 'popular courses', value: popularCourses },
        { label: 'total sales', value: this.toNumber(revenue._sum.amount) },
        {
          label: 'engagement',
          value: communityReports + latestReviews.length + skillTestUsage,
        },
        { label: 'ai test usage', value: skillTestUsage },
      ],
      latestReviews: latestReviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        author: review.user?.fullname ?? 'Learney member',
        course: this.parseLocalized(
          review.course.title,
          review.course.courseName,
        ),
      })),
      activePromotion: activePromotion
        ? {
            id: activePromotion.id,
            title: this.parseLocalized(activePromotion.title, 'Promotion'),
            type: activePromotion.type,
          }
        : null,
      activeTheme: activeTheme
        ? {
            key: activeTheme.key,
            name: this.parseLocalized(activeTheme.name, 'Theme'),
          }
        : null,
      aiQueueCount,
      quickActions: [
        { label: 'Add Course', href: '/admin/ai-course-builder' },
        { label: 'Publish Promotion', href: '/admin/promotions' },
        {
          label: 'Change Homepage Popular Courses',
          href: '/admin/popular-courses',
        },
        { label: 'Moderate Community', href: '/admin/community' },
        { label: 'Change Theme', href: '/admin/seasonal-themes' },
      ],
    };
  }

  async getAdminSection(section: string) {
    switch (section) {
      case 'courses':
        return {
          items: (
            await this.prisma.course.findMany({
              orderBy: { updatedAt: 'desc' },
              include: {
                categoryRecord: true,
                displayInstructor: true,
                instructor: {
                  select: { id: true, fullname: true, image: true },
                },
                promotions: { include: { promotion: true } },
              },
            })
          ).map((course) => this.courseToCard(course)),
        };
      case 'fixed-categories':
        return {
          items: await this.prisma.category.findMany({
            orderBy: { order: 'asc' },
          }),
        };
      case 'instructors':
        return {
          items: await this.prisma.instructorProfile.findMany({
            include: {
              user: { select: { fullname: true, email: true } },
              displayedCourses: true,
            },
            orderBy: { updatedAt: 'desc' },
          }),
        };
      case 'video-preview':
        return {
          items: await this.prisma.course.findMany({
            select: {
              id: true,
              slug: true,
              courseName: true,
              title: true,
              previewVideoUrl: true,
              previewThumbnail: true,
              isPublished: true,
            },
            orderBy: { updatedAt: 'desc' },
          }),
        };
      case 'ratings-reviews':
        return {
          items: await this.prisma.review.findMany({
            include: {
              course: {
                select: {
                  courseName: true,
                  title: true,
                },
              },
              user: {
                select: { fullname: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
        };
      case 'popular-courses':
        return {
          items: await this.prisma.homepageFeaturedCourse.findMany({
            include: {
              course: true,
            },
            orderBy: { rank: 'asc' },
          }),
        };
      case 'community':
        return {
          threads: await this.prisma.communityThread.findMany({
            include: {
              user: { select: { fullname: true, role: true } },
              reports: { where: { resolved: false } },
            },
            orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
          }),
          replies: await this.prisma.communityReply.findMany({
            include: {
              user: { select: { fullname: true, role: true } },
              reports: { where: { resolved: false } },
            },
            orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
          }),
        };
      case 'promotions':
        return {
          items: await this.prisma.promotion.findMany({
            include: {
              courses: {
                include: {
                  course: true,
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
          }),
        };
      case 'seasonal-themes':
        return {
          items: await this.prisma.seasonalTheme.findMany({
            orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
          }),
        };
      case 'ai-tests':
        return {
          skillTests: await this.prisma.skillTest.findMany({
            include: { questions: true },
            orderBy: { createdAt: 'desc' },
          }),
          courseAssessments: await this.prisma.courseAssessment.findMany({
            include: {
              course: true,
              questions: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
        };
      case 'career-matching':
        return {
          items: await this.prisma.career.findMany({
            include: { rules: true },
            orderBy: { createdAt: 'desc' },
          }),
        };
      case 'analytics': {
        const overview = await this.getAdminOverview();
        const snapshots = await this.prisma.analyticsSnapshot.findMany({
          orderBy: { createdAt: 'desc' },
        });
        return { overview, snapshots };
      }
      case 'settings':
        return {
          defaults: {
            locale: 'th',
            theme: 'light',
            publicCommunity: true,
            memberWrite: true,
          },
        };
      case 'ai-course-builder':
      case 'ai-lesson-generator':
      case 'ai-video-content-studio':
      case 'ai-case-study-generator':
      case 'ai-quiz-generator':
      case 'course-expansion-suggestions':
        return {
          recentJobs: await this.prisma.aiGenerationJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: {
              course: true,
              drafts: true,
            },
          }),
          courses: await this.prisma.course.findMany({
            select: {
              id: true,
              slug: true,
              courseName: true,
              title: true,
              workflowStatus: true,
            },
            orderBy: { updatedAt: 'desc' },
          }),
          categories: await this.prisma.category.findMany({
            orderBy: { order: 'asc' },
          }),
        };
      case 'content-review-queue':
      case 'ai-draft-approval':
        return {
          items: await this.prisma.aiDraft.findMany({
            where: {
              status: {
                in: [
                  AiDraftStatus.AI_GENERATED,
                  AiDraftStatus.ADMIN_REVIEW,
                  AiDraftStatus.EDITED,
                ],
              },
            },
            include: {
              course: true,
              job: true,
            },
            orderBy: { updatedAt: 'desc' },
          }),
        };
      default:
        return this.getAdminOverview();
    }
  }

  private async runAiJob(adminId: string, payload: Record<string, unknown>) {
    const type = String(payload.type ?? 'COURSE_BLUEPRINT') as AiJobType;
    const title = String(payload.title ?? 'AI Generated Course');
    const categoryKey = String(payload.categoryKey ?? 'business');
    const targetAudience = String(payload.targetAudience ?? 'modern learners');
    const level = String(payload.level ?? 'Intermediate');
    const learningGoal = String(
      payload.learningGoal ?? 'build a practical new skill',
    );
    const variantType = payload.variantType
      ? String(payload.variantType)
      : undefined;
    const baseCourseId = payload.courseId
      ? String(payload.courseId)
      : undefined;
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [
          { key: categoryKey },
          { slug: categoryKey },
          { legacyName: categoryKey },
        ],
      },
    });

    let course = baseCourseId
      ? await this.prisma.course.findUnique({ where: { id: baseCourseId } })
      : null;

    const generated = this.aiContentService.generate(type, {
      title,
      category: category?.legacyName ?? category?.key ?? categoryKey,
      targetAudience,
      level,
      learningGoal,
      variantType,
      sourceTitle: course?.courseName,
    });

    if (
      !course &&
      (type === AiJobType.COURSE_BLUEPRINT ||
        type === AiJobType.COURSE_EXPANSION)
    ) {
      course = await this.prisma.course.create({
        data: {
          slug: `${this.slugify(title)}-${Date.now().toString().slice(-4)}`,
          courseName: title,
          title: { th: title, en: title },
          shortDescription: {
            th: 'คอร์สร่างที่สร้างโดยระบบ AI Course Builder',
            en: 'Draft course generated by the AI Course Builder.',
          },
          description: 'AI-generated draft course.',
          localizedDescription: {
            th: 'ร่างคอร์สใหม่ที่กำลังรอการทบทวน',
            en: 'A new draft course waiting for admin review.',
          },
          category: category?.legacyName ?? categoryKey,
          categoryId: category?.id,
          coverImage: null,
          thumbnail:
            'https://placehold.co/1200x800/f6d5de/4a3245?text=LEARNEY+AI+Draft',
          previewThumbnail:
            'https://placehold.co/1200x800/f5e6c8/4a3245?text=Review+Preview',
          price: 6900,
          discount: 0,
          discountPrice: null,
          level,
          badge: 'AI Draft',
          tags: ['ai-generated', category?.key ?? categoryKey],
          status: Status.PENDING,
          workflowStatus: CourseWorkflowStatus.AI_GENERATED,
          sourceType:
            type === AiJobType.COURSE_EXPANSION
              ? CourseSourceType.EXPANDED
              : CourseSourceType.AI_GENERATED,
          isPopular: false,
          isFeatured: false,
          isPublished: false,
          learnerCount: 0,
          reviewCount: 0,
          instructorId: adminId,
          willLearnMessages: [],
          requirements: [],
        },
      });
    }

    if (!course) {
      throw new BadRequestException('A course is required for this AI job');
    }

    const job = await this.prisma.aiGenerationJob.create({
      data: {
        courseId: course.id,
        createdById: adminId,
        type,
        promptContext: {
          title,
          category: category?.legacyName ?? categoryKey,
          targetAudience,
          level,
          learningGoal,
          variantType,
        },
        sourceReferences: {
          baseCourseId,
          sourceTitle: course.courseName,
        },
        result: generated,
        status: AiDraftStatus.ADMIN_REVIEW,
      },
    });

    const draft = await this.prisma.aiDraft.create({
      data: {
        courseId: course.id,
        jobId: job.id,
        draftType: type.toLowerCase(),
        title,
        content: generated,
        status: AiDraftStatus.ADMIN_REVIEW,
      },
    });

    await this.prisma.course.update({
      where: { id: course.id },
      data: {
        workflowStatus: CourseWorkflowStatus.ADMIN_REVIEW,
        status: Status.PENDING,
      },
    });

    return { job, draft, courseId: course.id };
  }

  async applyAdminAction(
    section: string,
    dto: AdminConsoleActionDto,
    adminId: string,
  ) {
    const payload = dto.payload ?? {};

    switch (section) {
      case 'courses': {
        const courseId = String(payload.courseId ?? '');
        if (!courseId) {
          throw new BadRequestException('courseId is required');
        }

        if (dto.action === 'publish_course') {
          await this.prisma.course.update({
            where: { id: courseId },
            data: {
              isPublished: true,
              publishedAt: new Date(),
              workflowStatus: CourseWorkflowStatus.PUBLISHED,
              status: Status.ACTIVE,
            },
          });
        }

        if (dto.action === 'unpublish_course') {
          await this.prisma.course.update({
            where: { id: courseId },
            data: {
              isPublished: false,
              workflowStatus: CourseWorkflowStatus.APPROVED,
            },
          });
        }

        if (dto.action === 'toggle_popular') {
          await this.prisma.course.update({
            where: { id: courseId },
            data: {
              isPopular: Boolean(payload.value),
            },
          });
        }

        if (dto.action === 'toggle_featured') {
          await this.prisma.course.update({
            where: { id: courseId },
            data: {
              isFeatured: Boolean(payload.value),
            },
          });
        }

        if (dto.action === 'update_workflow') {
          await this.prisma.course.update({
            where: { id: courseId },
            data: {
              workflowStatus: String(
                payload.workflowStatus,
              ) as CourseWorkflowStatus,
            },
          });
        }

        return { message: 'Course updated' };
      }

      case 'fixed-categories': {
        const categoryId = String(payload.categoryId ?? '');
        if (!categoryId) {
          throw new BadRequestException('categoryId is required');
        }

        if (dto.action === 'toggle_visibility') {
          await this.prisma.category.update({
            where: { id: categoryId },
            data: { visible: Boolean(payload.value) },
          });
        }

        if (dto.action === 'reorder') {
          await this.prisma.category.update({
            where: { id: categoryId },
            data: { order: Number(payload.order ?? 0) },
          });
        }

        return { message: 'Category updated' };
      }

      case 'instructors': {
        const instructorId = String(payload.instructorId ?? '');
        if (!instructorId) {
          throw new BadRequestException('instructorId is required');
        }

        await this.prisma.instructorProfile.update({
          where: { id: instructorId },
          data: { visible: Boolean(payload.value) },
        });

        return { message: 'Instructor updated' };
      }

      case 'video-preview': {
        const courseId = String(payload.courseId ?? '');
        await this.prisma.course.update({
          where: { id: courseId },
          data: {
            previewVideoUrl: String(payload.previewVideoUrl ?? ''),
            previewThumbnail: String(payload.previewThumbnail ?? ''),
          },
        });
        return { message: 'Preview updated' };
      }

      case 'ratings-reviews': {
        const reviewId = String(payload.reviewId ?? '');
        if (!reviewId) {
          throw new BadRequestException('reviewId is required');
        }

        if (dto.action === 'toggle_visibility') {
          await this.prisma.review.update({
            where: { id: reviewId },
            data: { visible: Boolean(payload.value) },
          });
        }

        if (dto.action === 'pin_review') {
          await this.prisma.review.update({
            where: { id: reviewId },
            data: { pinned: Boolean(payload.value) },
          });
        }

        if (dto.action === 'delete_review') {
          await this.prisma.review.update({
            where: { id: reviewId },
            data: {
              moderationStatus: ModerationStatus.DELETED,
              visible: false,
            },
          });
        }

        return { message: 'Review updated' };
      }

      case 'popular-courses': {
        const courseId = String(payload.courseId ?? '');
        const existing = await this.prisma.homepageFeaturedCourse.findUnique({
          where: { courseId },
        });
        if (existing) {
          await this.prisma.homepageFeaturedCourse.update({
            where: { courseId },
            data: {
              rank: Number(payload.rank ?? existing.rank),
              badge: payload.badge ? String(payload.badge) : existing.badge,
            },
          });
        } else {
          await this.prisma.homepageFeaturedCourse.create({
            data: {
              courseId,
              rank: Number(payload.rank ?? 99),
              badge: payload.badge ? String(payload.badge) : 'Popular',
            },
          });
        }
        return { message: 'Featured ranking updated' };
      }

      case 'community': {
        if (dto.action === 'pin_thread') {
          await this.prisma.communityThread.update({
            where: { id: String(payload.threadId) },
            data: { pinned: Boolean(payload.value) },
          });
        }

        if (dto.action === 'hide_thread') {
          await this.prisma.communityThread.update({
            where: { id: String(payload.threadId) },
            data: {
              visible: false,
              moderationStatus: ModerationStatus.HIDDEN,
            },
          });
        }

        if (dto.action === 'resolve_report') {
          await this.prisma.communityReport.update({
            where: { id: String(payload.reportId) },
            data: { resolved: true },
          });
        }

        return { message: 'Community updated' };
      }

      case 'promotions': {
        if (dto.action === 'toggle_active') {
          const promotionId = String(payload.promotionId ?? '');
          const nextActive = Boolean(payload.value);
          await this.prisma.promotion.update({
            where: { id: promotionId },
            data: { active: nextActive },
          });
          return { message: 'Promotion updated' };
        }

        if (dto.action === 'save_promotion') {
          const promotionId =
            typeof payload.promotionId === 'string' ? payload.promotionId : '';
          const data = {
            slug: String(payload.slug ?? `promotion-${Date.now()}`),
            title: payload.title ?? { th: 'โปรโมชันใหม่', en: 'New Promotion' },
            description: payload.description ?? { th: '', en: '' },
            type: String(payload.type ?? 'FEATURED_CAMPAIGN') as PromotionType,
            discount: Number(payload.discount ?? 0),
            banner: String(payload.banner ?? ''),
            promoCode: String(payload.promoCode ?? ''),
            startDate: new Date(
              String(payload.startDate ?? new Date().toISOString()),
            ),
            endDate: new Date(
              String(
                payload.endDate ??
                  new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
              ),
            ),
            active: Boolean(payload.active),
            themeKey: payload.themeKey
              ? (String(payload.themeKey) as SeasonalThemeKey)
              : null,
          };

          if (promotionId) {
            await this.prisma.promotion.update({
              where: { id: promotionId },
              data,
            });
          } else {
            await this.prisma.promotion.create({
              data,
            });
          }
          return { message: 'Promotion saved' };
        }

        break;
      }

      case 'seasonal-themes': {
        if (dto.action === 'activate_theme') {
          const themeId = String(payload.themeId ?? '');
          await this.prisma.seasonalTheme.updateMany({
            data: { active: false },
          });
          await this.prisma.seasonalTheme.update({
            where: { id: themeId },
            data: {
              active: true,
              previewMode: false,
            },
          });
          return { message: 'Theme activated' };
        }

        if (dto.action === 'preview_theme') {
          const themeId = String(payload.themeId ?? '');
          await this.prisma.seasonalTheme.updateMany({
            data: { previewMode: false },
          });
          await this.prisma.seasonalTheme.update({
            where: { id: themeId },
            data: { previewMode: true },
          });
          return { message: 'Theme preview updated' };
        }

        break;
      }

      case 'ai-tests': {
        if (dto.action === 'toggle_assessment') {
          await this.prisma.courseAssessment.update({
            where: { id: String(payload.assessmentId) },
            data: { active: Boolean(payload.value) },
          });
          return { message: 'Assessment updated' };
        }
        break;
      }

      case 'career-matching': {
        if (dto.action === 'save_career_rule') {
          const ruleId =
            typeof payload.ruleId === 'string' ? payload.ruleId : '';
          const data = {
            careerId: String(payload.careerId ?? ''),
            ageGroup: payload.ageGroup ? String(payload.ageGroup) : null,
            skillCategory: String(payload.skillCategory ?? 'Communication'),
            threshold: Number(payload.threshold ?? 70),
            weight: Number(payload.weight ?? 1),
            recommendedCourseIds: Array.isArray(payload.recommendedCourseIds)
              ? payload.recommendedCourseIds.map((value) => String(value))
              : [],
          };

          if (ruleId) {
            await this.prisma.careerRule.update({
              where: { id: ruleId },
              data,
            });
          } else {
            await this.prisma.careerRule.create({
              data,
            });
          }

          return { message: 'Career rule saved' };
        }
        break;
      }

      case 'analytics': {
        await this.prisma.analyticsSnapshot.create({
          data: {
            snapshotType: 'manual-refresh',
            payload: {
              refreshedBy: adminId,
              refreshedAt: new Date().toISOString(),
            },
          },
        });
        return { message: 'Analytics refreshed' };
      }

      case 'ai-course-builder':
      case 'ai-lesson-generator':
      case 'ai-video-content-studio':
      case 'ai-case-study-generator':
      case 'ai-quiz-generator':
      case 'course-expansion-suggestions':
        if (dto.action === 'run_ai_job') {
          return this.runAiJob(adminId, payload);
        }
        break;

      case 'content-review-queue':
      case 'ai-draft-approval': {
        const draftId = String(payload.draftId ?? '');
        if (!draftId) {
          throw new BadRequestException('draftId is required');
        }

        if (dto.action === 'approve_draft') {
          const draft = await this.prisma.aiDraft.update({
            where: { id: draftId },
            data: {
              status: AiDraftStatus.APPROVED,
              approvedById: adminId,
            },
            include: { course: true },
          });

          if (draft.courseId) {
            await this.prisma.course.update({
              where: { id: draft.courseId },
              data: {
                workflowStatus: CourseWorkflowStatus.APPROVED,
                status: Status.ACTIVE,
              },
            });
          }

          return { message: 'Draft approved' };
        }

        if (dto.action === 'edit_draft') {
          await this.prisma.aiDraft.update({
            where: { id: draftId },
            data: {
              content: payload.content ?? {},
              reviewNotes: payload.reviewNotes ?? [],
              editedById: adminId,
              status: AiDraftStatus.EDITED,
            },
          });
          return { message: 'Draft updated' };
        }

        if (dto.action === 'set_draft_status') {
          await this.prisma.aiDraft.update({
            where: { id: draftId },
            data: {
              status: String(
                payload.status ?? AiDraftStatus.ADMIN_REVIEW,
              ) as AiDraftStatus,
            },
          });
          return { message: 'Draft status updated' };
        }

        break;
      }
    }

    return { message: 'No action performed' };
  }
}
