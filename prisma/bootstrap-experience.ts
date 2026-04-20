import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AiDraftStatus,
  AiJobType,
  AssessmentKind,
  CourseSourceType,
  CourseWorkflowStatus,
  LocaleCode,
  ModerationStatus,
  PrismaClient,
  PromotionType,
  Role,
  SeasonalThemeKey,
  Status,
} from '../src/database/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const localized = (th: string, en: string) => ({ th, en });

const categorySeed = [
  ['ai-digital-skills', 'AI & Digital Skills', 'AI และทักษะดิจิทัล', 'Sparkles', '#f8a4b7'],
  ['marketing', 'Marketing', 'การตลาด', 'Megaphone', '#f4c26b'],
  ['business', 'Business', 'ธุรกิจ', 'BriefcaseBusiness', '#c7b4f9'],
  ['design', 'Design', 'ดีไซน์', 'Palette', '#f6aac8'],
  ['programming', 'Programming', 'Programming', 'Code2', '#8fd7ff'],
  ['content-creator', 'Content Creator', 'คอนเทนต์ครีเอเตอร์', 'Clapperboard', '#ffd68a'],
  ['personal-development', 'Personal Development', 'พัฒนาตนเอง', 'HeartHandshake', '#ffb4d2'],
  ['language', 'Language', 'ภาษา', 'Languages', '#bda9ff'],
  ['career-skills', 'Career Skills', 'ทักษะอาชีพ', 'TrendingUp', '#f8c97b'],
] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

function inferCategoryKey(category: string) {
  const lower = category.toLowerCase();

  if (lower.includes('design')) return 'design';
  if (lower.includes('marketing')) return 'marketing';
  if (lower.includes('business')) return 'business';
  if (lower.includes('lang')) return 'language';
  if (lower.includes('content')) return 'content-creator';
  if (lower.includes('career')) return 'career-skills';
  if (lower.includes('personal')) return 'personal-development';
  if (lower.includes('program') || lower.includes('dev')) return 'programming';
  return 'ai-digital-skills';
}

async function ensureBaseUsersAndCourses() {
  const passwordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {
      fullname: 'Admin',
      role: Role.ADMIN,
    },
    create: {
      fullname: 'Admin',
      email: 'admin@test.com',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@test.com' },
    update: {
      fullname: 'Instructor A',
      role: Role.INSTRUCTOR,
    },
    create: {
      fullname: 'Instructor A',
      email: 'instructor@test.com',
      password: passwordHash,
      role: Role.INSTRUCTOR,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {
      fullname: 'Student User',
      role: Role.USER,
    },
    create: {
      fullname: 'Student User',
      email: 'student@test.com',
      password: passwordHash,
      role: Role.USER,
    },
  });

  const existingCourses = await prisma.course.count();

  if (existingCourses === 0) {
    const sampleCourses = await Promise.all([
      prisma.course.create({
        data: {
          courseName: 'AI for Work Foundations',
          description: 'Build practical AI workflows for modern digital work.',
          category: 'AI & Digital Skills',
          thumbnail: 'https://placehold.co/1200x800/f7dfe5/4a3245?text=AI+FOR+WORK',
          price: 2490,
          discount: 490,
          tags: ['ai', 'workflow', 'productivity'],
          status: Status.ACTIVE,
          instructorId: instructor.id,
        },
      }),
      prisma.course.create({
        data: {
          courseName: 'Marketing with AI Systems',
          description: 'Use AI to plan campaigns, analyze content, and improve output quality.',
          category: 'Marketing',
          thumbnail: 'https://placehold.co/1200x800/f9e8b7/4a3245?text=AI+MARKETING',
          price: 2890,
          discount: 590,
          tags: ['marketing', 'campaigns', 'analytics'],
          status: Status.ACTIVE,
          instructorId: instructor.id,
        },
      }),
      prisma.course.create({
        data: {
          courseName: 'Creator Toolkit for the AI Era',
          description: 'Create better content systems with AI-assisted planning and production.',
          category: 'Content Creator',
          thumbnail: 'https://placehold.co/1200x800/ddd2fb/4a3245?text=AI+CREATOR',
          price: 2190,
          discount: 390,
          tags: ['creator', 'content', 'ai'],
          status: Status.ACTIVE,
          instructorId: instructor.id,
        },
      }),
    ]);

    await prisma.enrolledCourse.create({
      data: {
        userId: student.id,
        courseId: sampleCourses[0].id,
      },
    });

    await prisma.review.createMany({
      data: [
        {
          courseId: sampleCourses[0].id,
          userId: student.id,
          rating: 5,
          content: 'ช่วยให้เห็นภาพการใช้ AI กับงานจริงชัดขึ้นมาก',
        },
        {
          courseId: sampleCourses[1].id,
          userId: student.id,
          rating: 4,
          content: 'นำไปต่อยอดกับแผนการตลาดได้เลย',
        },
        {
          courseId: sampleCourses[2].id,
          userId: student.id,
          rating: 5,
          content: 'โทนการสอนเป็นมิตรและใช้ได้จริง',
        },
      ],
      skipDuplicates: true,
    });
  }

  return { admin, instructor, student };
}

async function main() {
  await ensureBaseUsersAndCourses();

  const categories = new Map<string, string>();

  for (const [index, [key, legacyName, thaiName, icon, color]] of categorySeed.entries()) {
    const category = await prisma.category.upsert({
      where: { key },
      update: {
        slug: key,
        name: localized(thaiName, legacyName),
        legacyName,
        icon,
        color,
        order: index + 1,
        visible: true,
      },
      create: {
        key,
        slug: key,
        name: localized(thaiName, legacyName),
        legacyName,
        icon,
        color,
        order: index + 1,
        visible: true,
      },
    });

    categories.set(key, category.id);
  }

  const instructorUsers = await prisma.user.findMany({
    where: { role: Role.INSTRUCTOR },
  });

  for (const user of instructorUsers) {
    await prisma.instructorProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: user.fullname,
        image: user.image,
        bio: localized(
          `${user.fullname} พร้อมแบ่งปันประสบการณ์การทำงานจริง`,
          `${user.fullname} shares practical experience from real-world work.`,
        ),
        headline: localized('ผู้สอน LEARNEY', 'Learney Instructor'),
        visible: true,
      },
      create: {
        userId: user.id,
        displayName: user.fullname,
        image: user.image,
        bio: localized(
          `${user.fullname} พร้อมแบ่งปันประสบการณ์การทำงานจริง`,
          `${user.fullname} shares practical experience from real-world work.`,
        ),
        headline: localized('ผู้สอน LEARNEY', 'Learney Instructor'),
        visible: true,
        specialties: ['AI', 'Digital Skills'],
      },
    });
  }

  const profileByUserId = new Map(
    (
      await prisma.instructorProfile.findMany({
        select: { id: true, userId: true },
      })
    ).map((profile) => [profile.userId, profile.id]),
  );

  const courses = await prisma.course.findMany({
    include: {
      reviews: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const [index, course] of courses.entries()) {
    const categoryKey = inferCategoryKey(course.category);
    const reviewAverage =
      course.reviews.length > 0
        ? course.reviews.reduce((sum, review) => sum + review.rating, 0) /
          course.reviews.length
        : 4.6;

    await prisma.course.update({
      where: { id: course.id },
      data: {
        slug: course.slug ?? `${slugify(course.courseName)}-${course.id.slice(0, 6)}`,
        title: course.title ?? localized(course.courseName, course.courseName),
        shortDescription:
          course.shortDescription ??
          localized(
            `คอร์ส ${course.courseName} สำหรับพัฒนาทักษะใหม่แบบนำไปใช้ได้จริง`,
            `${course.courseName} is designed to help learners build practical new skills.`,
          ),
        localizedDescription:
          course.localizedDescription ??
          localized(course.description, course.description),
        categoryId: course.categoryId ?? categories.get(categoryKey) ?? null,
        coverImage: course.coverImage ?? course.thumbnail,
        previewVideoUrl: course.previewVideoUrl ?? course.videoPreview,
        previewThumbnail: course.previewThumbnail ?? course.thumbnail,
        discountPrice:
          course.discountPrice ??
          (course.discount ? Number(course.price) - Number(course.discount) : null),
        level: course.level ?? (index % 3 === 0 ? 'Beginner' : index % 3 === 1 ? 'Intermediate' : 'Advanced'),
        badge:
          course.badge ??
          (index < 2 ? 'Best Seller' : index < 5 ? 'Popular' : 'Recommended'),
        workflowStatus:
          course.workflowStatus ??
          (course.status === Status.ACTIVE
            ? CourseWorkflowStatus.PUBLISHED
            : CourseWorkflowStatus.ADMIN_REVIEW),
        sourceType: course.sourceType ?? CourseSourceType.MANUAL,
        isPopular: course.isPopular || index < 6,
        isFeatured: course.isFeatured || index < 3,
        isPublished: course.isPublished || course.status === Status.ACTIVE,
        publishedAt:
          course.publishedAt ??
          (course.status === Status.ACTIVE ? course.createdAt : null),
        learnerCount: course.learnerCount || 240 + index * 47,
        reviewCount: course.reviewCount || course.reviews.length,
        averageRating: course.averageRating ?? reviewAverage,
        duration: course.duration ?? `${4 + (index % 5)}h ${15 + index * 3}m`,
        language: course.language ?? LocaleCode.TH,
        displayInstructorId:
          course.displayInstructorId ?? profileByUserId.get(course.instructorId) ?? null,
      },
    });

    const assessmentCount = await prisma.courseAssessment.count({
      where: { courseId: course.id },
    });

    if (assessmentCount === 0) {
      for (const kind of [AssessmentKind.PRE_TEST, AssessmentKind.POST_TEST]) {
        const assessment = await prisma.courseAssessment.create({
          data: {
            courseId: course.id,
            kind,
            title: localized(
              kind === AssessmentKind.PRE_TEST ? 'Pre-test ก่อนเรียน' : 'Post-test หลังเรียน',
              kind === AssessmentKind.PRE_TEST ? 'Pre-test before learning' : 'Post-test after learning',
            ),
            description: localized(
              'แบบประเมินเพื่อช่วยให้เห็นพัฒนาการของผู้เรียน',
              'An assessment to help visualize learner growth.',
            ),
          },
        });

        await prisma.assessmentQuestion.createMany({
          data: ['Creativity', 'Leadership', 'Helping Others', 'Analysis', 'Communication', 'Teamwork'].map(
            (category, order) => ({
              courseAssessmentId: assessment.id,
              prompt: localized(
                `ฉันมั่นใจในการใช้ ${category} กับบริบทของคอร์สนี้`,
                `I feel confident using ${category} in this course context.`,
              ),
              category,
              options: [1, 2, 3, 4, 5],
              explanation: localized('เลือกคะแนนที่ใกล้เคียงตัวคุณที่สุด', 'Choose the score that fits you best.'),
              order: order + 1,
            }),
          ),
        });
      }
    }
  }

  for (const [index, course] of courses.slice(0, 3).entries()) {
    await prisma.homepageFeaturedCourse.upsert({
      where: { courseId: course.id },
      update: {
        rank: index + 1,
        badge: index === 0 ? 'Best Seller' : index === 1 ? 'Popular' : 'Trending',
      },
      create: {
        courseId: course.id,
        rank: index + 1,
        badge: index === 0 ? 'Best Seller' : index === 1 ? 'Popular' : 'Trending',
      },
    });
  }

  for (const theme of [
    [SeasonalThemeKey.SONGKRAN, localized('สงกรานต์', 'Songkran'), true, false],
    [SeasonalThemeKey.NEW_YEAR, localized('ปีใหม่', 'New Year'), false, false],
    [SeasonalThemeKey.VALENTINE, localized('วาเลนไทน์', 'Valentine'), false, true],
    [SeasonalThemeKey.HALLOWEEN, localized('ฮาโลวีน', 'Halloween'), false, false],
  ] as const) {
    await prisma.seasonalTheme.upsert({
      where: { key: theme[0] },
      update: {
        name: theme[1],
        active: theme[2],
        previewMode: theme[3],
      },
      create: {
        key: theme[0],
        name: theme[1],
        active: theme[2],
        previewMode: theme[3],
        assets: {},
      },
    });
  }

  const activeCourses = await prisma.course.findMany({
    where: { isPublished: true },
    take: 6,
    orderBy: { learnerCount: 'desc' },
  });

  const flashSale = await prisma.promotion.upsert({
    where: { slug: 'flash-sale-ai-sprint' },
    update: {
      title: localized('Flash Sale: AI Sprint Week', 'Flash Sale: AI Sprint Week'),
      description: localized(
        'โปรโมชันสำหรับคอร์สยอดนิยมที่ช่วยให้คุณอัปสกิลได้เร็วขึ้น',
        'A campaign for popular courses that help learners upskill quickly.',
      ),
      type: PromotionType.FLASH_SALE,
      discount: 25,
      active: true,
      themeKey: SeasonalThemeKey.SONGKRAN,
      startDate: new Date('2026-04-01T00:00:00Z'),
      endDate: new Date('2026-04-30T23:59:59Z'),
      promoCode: 'SPRINT25',
    },
    create: {
      slug: 'flash-sale-ai-sprint',
      title: localized('Flash Sale: AI Sprint Week', 'Flash Sale: AI Sprint Week'),
      description: localized(
        'โปรโมชันสำหรับคอร์สยอดนิยมที่ช่วยให้คุณอัปสกิลได้เร็วขึ้น',
        'A campaign for popular courses that help learners upskill quickly.',
      ),
      type: PromotionType.FLASH_SALE,
      discount: 25,
      active: true,
      banner: 'https://placehold.co/1400x700/f6dbe3/4a3245?text=FLASH+SALE',
      themeKey: SeasonalThemeKey.SONGKRAN,
      startDate: new Date('2026-04-01T00:00:00Z'),
      endDate: new Date('2026-04-30T23:59:59Z'),
      promoCode: 'SPRINT25',
    },
  });

  for (const course of activeCourses.slice(0, 4)) {
    await prisma.promotionCourse.upsert({
      where: {
        promotionCourseIdentifier: {
          promotionId: flashSale.id,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        promotionId: flashSale.id,
        courseId: course.id,
      },
    });
  }

  const testConfigs = [
    'Primary School (7-12)',
    'Secondary School (13-18)',
    'University (19-22)',
    'Working Age (23+)',
  ];

  for (const ageGroup of testConfigs) {
    const test = await prisma.skillTest.upsert({
      where: { slug: slugify(ageGroup) },
      update: {
        title: localized('คุณอาจเก่งมากกว่าที่คิด', 'You might be more capable than you think'),
        intro: localized(
          'ค้นหาจุดแข็งและเส้นทางอาชีพที่เหมาะกับตัวคุณ',
          'Discover strengths and career directions that fit you.',
        ),
      },
      create: {
        slug: slugify(ageGroup),
        ageGroup,
        title: localized('คุณอาจเก่งมากกว่าที่คิด', 'You might be more capable than you think'),
        intro: localized(
          'ค้นหาจุดแข็งและเส้นทางอาชีพที่เหมาะกับตัวคุณ',
          'Discover strengths and career directions that fit you.',
        ),
      },
    });

    if (
      (await prisma.skillTestQuestion.count({
        where: { skillTestId: test.id },
      })) === 0
    ) {
      await prisma.skillTestQuestion.createMany({
        data: ['Creativity', 'Leadership', 'Helping Others', 'Analysis', 'Communication', 'Teamwork'].map(
          (category, order) => ({
            skillTestId: test.id,
            prompt: localized(
              `ฉันสนุกเมื่อได้ใช้ ${category} เพื่อทำให้สิ่งต่างๆ ดีขึ้น`,
              `I feel energized when I use ${category} to improve something.`,
            ),
            category,
            order: order + 1,
            weight: 1,
          }),
        ),
      });
    }
  }

  const careerCourses = await prisma.course.findMany({
    where: { isPublished: true },
    take: 3,
    orderBy: { learnerCount: 'desc' },
  });

  const careers = [
    ['marketing-strategist', 'Marketing Strategist', 'นักกลยุทธ์การตลาด', ['Communication', 'Analysis', 'Creativity']],
    ['ux-ui-designer', 'UX/UI Designer', 'UX/UI Designer', ['Creativity', 'Analysis', 'Communication']],
    ['programmer', 'Programmer', 'โปรแกรมเมอร์', ['Analysis', 'Teamwork', 'Communication']],
  ] as const;

  for (const [slug, enName, thName, requiredSkills] of careers) {
    const career = await prisma.career.upsert({
      where: { slug },
      update: {
        name: localized(thName, enName),
        summary: localized(
          `เส้นทาง ${thName} ที่เชื่อมจุดแข็งเข้ากับโลกการทำงานยุคดิจิทัล`,
          `${enName} is a path that turns strengths into modern digital work.`,
        ),
        image: 'https://placehold.co/1200x800/f4dce5/4a3245?text=Career',
        salaryRange: '฿25,000 - ฿95,000 / month',
        requiredSkills,
      },
      create: {
        slug,
        name: localized(thName, enName),
        summary: localized(
          `เส้นทาง ${thName} ที่เชื่อมจุดแข็งเข้ากับโลกการทำงานยุคดิจิทัล`,
          `${enName} is a path that turns strengths into modern digital work.`,
        ),
        image: 'https://placehold.co/1200x800/f4dce5/4a3245?text=Career',
        salaryRange: '฿25,000 - ฿95,000 / month',
        requiredSkills,
      },
    });

    if (
      (await prisma.careerRule.count({
        where: { careerId: career.id },
      })) === 0
    ) {
      await prisma.careerRule.create({
        data: {
          careerId: career.id,
          skillCategory: requiredSkills[0],
          threshold: 70,
          weight: 2,
          recommendedCourseIds: careerCourses.map((course) => course.id),
        },
      });
    }
  }

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  const draftCourse = await prisma.course.findFirst({
    where: { workflowStatus: CourseWorkflowStatus.ADMIN_REVIEW },
  });

  if (admin && draftCourse) {
    const existingDraft = await prisma.aiDraft.findFirst({
      where: { courseId: draftCourse.id },
    });

    if (!existingDraft) {
      const job = await prisma.aiGenerationJob.create({
        data: {
          courseId: draftCourse.id,
          createdById: admin.id,
          type: AiJobType.COURSE_BLUEPRINT,
          promptContext: {
            title: draftCourse.courseName,
            targetAudience: 'modern learners',
            level: draftCourse.level ?? 'Intermediate',
          },
          result: {
            modules: ['Foundation', 'Applied Practice', 'Final Project'],
          },
          status: AiDraftStatus.ADMIN_REVIEW,
        },
      });

      await prisma.aiDraft.create({
        data: {
          courseId: draftCourse.id,
          jobId: job.id,
          draftType: 'course-blueprint',
          title: draftCourse.courseName,
          content: {
            learningOutcomes: ['Clear outcomes', 'Structured lessons', 'Review workflow'],
            finalProject: 'Create a practical implementation plan',
          },
          status: AiDraftStatus.ADMIN_REVIEW,
        },
      });
    }
  }

  const firstStudent = await prisma.user.findFirst({ where: { role: Role.USER } });
  if (
    firstStudent &&
    (await prisma.communityThread.count()) === 0 &&
    activeCourses[0]
  ) {
    await prisma.communityThread.create({
      data: {
        courseId: activeCourses[0].id,
        userId: firstStudent.id,
        title: localized(
          'มี use case ไหนที่ควรเริ่มก่อนดี',
          'Which use case should I start with first?',
        ),
        content: localized(
          'อยากเริ่มจากสิ่งที่เห็นผลเร็วที่สุดในทีมเล็ก',
          'I want to start with the fastest visible win for a small team.',
        ),
        type: 'QUESTION',
        pinned: true,
        visible: true,
        moderationStatus: ModerationStatus.VISIBLE,
      },
    });
  }

  console.log('✅ Experience bootstrap complete');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
