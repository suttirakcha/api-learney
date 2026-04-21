import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CourseTestType,
  CourseWorkflowStatus,
  DifficultyLevel,
  Status,
  TestQuestionType,
} from '../database/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

type RecommendationInput = {
  age?: number;
  budget?: number;
  currentCareer?: string;
  currentSkills?: string[];
  desiredSkills?: string[];
  educationLevel?: string;
  experienceLevel?: string;
  interests?: string[];
  learningGoal?: string;
  learningStyle?: string;
  studyHoursPerWeek?: number;
  targetCareer?: string;
};

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  private stringify(value: unknown) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return [record.th, record.en]
        .filter((item): item is string => typeof item === 'string')
        .join(' ');
    }
    return '';
  }

  private tokenize(values: Array<string | null | undefined>) {
    return [
      ...new Set(
        values
          .join(' ')
          .toLowerCase()
          .split(/[^a-z0-9ก-๙]+/i)
          .filter((token) => token.length >= 2),
      ),
    ];
  }

  private scoreCourse(
    course: {
      category: string;
      courseName: string;
      description: string;
      isFeatured: boolean;
      isPopular: boolean;
      level: string | null;
      tags: string[];
      title: unknown;
    },
    tokens: string[],
  ) {
    const searchable = [
      course.courseName,
      this.stringify(course.title),
      course.description,
      course.category,
      course.level ?? '',
      course.tags.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    const matchedTokens = tokens.filter((token) => searchable.includes(token));
    return (
      matchedTokens.length * 12 +
      (course.isFeatured ? 4 : 0) +
      (course.isPopular ? 3 : 0)
    );
  }

  async generateRecommendation(
    userId: string | null,
    input: RecommendationInput,
  ) {
    const courses = await this.prisma.course.findMany({
      where: {
        OR: [
          { isPublished: true },
          {
            workflowStatus: {
              in: [
                CourseWorkflowStatus.APPROVED,
                CourseWorkflowStatus.PUBLISHED,
              ],
            },
          },
          { status: Status.ACTIVE },
        ],
      },
      orderBy: [
        { isFeatured: 'desc' },
        { isPopular: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 24,
      select: {
        id: true,
        slug: true,
        courseName: true,
        title: true,
        description: true,
        category: true,
        level: true,
        tags: true,
        isPopular: true,
        isFeatured: true,
      },
    });

    if (courses.length === 0) {
      return {
        id: 'no-courses',
        aiSummary: 'ตอนนี้ยังไม่มีคอร์สเผยแพร่ให้แนะนำครับ',
        recommendations: [],
      };
    }

    const tokens = this.tokenize([
      input.currentCareer,
      input.targetCareer,
      input.learningGoal,
      ...(input.interests ?? []),
      ...(input.currentSkills ?? []),
      ...(input.desiredSkills ?? []),
    ]);

    const ranked = courses
      .map((course) => ({
        course,
        score: this.scoreCourse(course, tokens),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    const aiSummary = input.targetCareer
      ? `เส้นทางนี้เหมาะกับเป้าหมาย ${input.targetCareer} โดยเริ่มจากคอร์สที่ปูพื้นฐานให้แน่น แล้วค่อยต่อยอดไปสู่ทักษะที่ลงมือใช้ได้จริง`
      : 'ผมคัดคอร์สที่ช่วยต่อยอดจากความสนใจและจุดตั้งต้นของคุณให้แล้วครับ';

    try {
      return await this.prisma.userRecommendation.create({
        data: {
          userId,
          age: input.age ?? null,
          budget: input.budget ?? null,
          currentCareer: input.currentCareer ?? null,
          currentSkills: input.currentSkills ?? [],
          desiredSkills: input.desiredSkills ?? [],
          educationLevel: input.educationLevel ?? null,
          experienceLevel: input.experienceLevel ?? null,
          interests: input.interests ?? [],
          learningStyle: input.learningStyle ?? null,
          studyHoursPerWeek: input.studyHoursPerWeek ?? null,
          targetCareer: input.targetCareer ?? null,
          aiSummary,
          recommendations: {
            create: ranked.map((item, index) => ({
              courseId: item.course.id,
              score: Math.max(72, Math.min(98, item.score + 60)),
              reason: `เพราะคอร์สนี้เชื่อมกับเป้าหมาย ${input.targetCareer ?? 'ที่คุณสนใจ'} และช่วยต่อยอดจากความสนใจ ${input.interests?.slice(0, 2).join(', ') || 'ที่คุณระบุ'}`,
              sortOrder: index + 1,
            })),
          },
        },
        include: {
          recommendations: {
            orderBy: { sortOrder: 'asc' },
            include: {
              course: {
                select: {
                  id: true,
                  slug: true,
                  courseName: true,
                  title: true,
                  description: true,
                  thumbnail: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.warn(
        'Unable to persist AI recommendation history, returning preview payload instead.',
        error,
      );

      return {
        id: randomUUID(),
        userId,
        aiSummary,
        recommendations: ranked.map((item, index) => ({
          id: randomUUID(),
          score: Math.max(72, Math.min(98, item.score + 60)),
          reason: `เพราะคอร์สนี้เชื่อมกับเป้าหมาย ${input.targetCareer ?? 'ที่คุณสนใจ'} และช่วยต่อยอดจากความสนใจ ${input.interests?.slice(0, 2).join(', ') || 'ที่คุณระบุ'}`,
          sortOrder: index + 1,
          course: {
            id: item.course.id,
            slug: item.course.slug,
            courseName: item.course.courseName,
            title: item.course.title,
            description: item.course.description,
            thumbnail: null,
          },
        })),
      };
    }
  }

  async generateCourseTest(courseId: string, type: CourseTestType) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, courseName: true, category: true, description: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existingTest = await this.prisma.courseTest.findUnique({
      where: { courseId_type: { courseId, type } },
      select: { id: true },
    });

    if (existingTest) {
      await this.prisma.courseTest.delete({
        where: { id: existingTest.id },
      });
    }

    const prompts = [
      `ข้อใดอธิบายแก่นหลักของคอร์ส ${course.courseName} ได้ใกล้เคียงที่สุด`,
      `หากต้องเริ่มต้นเรียน ${course.category} สิ่งใดควรทำก่อน`,
      `ตัวอย่างการประยุกต์ใช้ ${course.courseName} ที่เหมาะสมคือข้อใด`,
      `ผู้เรียนควรให้ความสำคัญกับทักษะใดมากที่สุดในบทเรียนแรก`,
      `เมื่อเรียนจบบทนี้ ผลลัพธ์ที่คาดหวังคือข้อใด`,
    ];

    return this.prisma.courseTest.create({
      data: {
        courseId,
        type,
        title: `${type === CourseTestType.PRE_TEST ? 'Pre-test' : 'Post-test'}: ${course.courseName}`,
        description: `ชุดคำถามอัตโนมัติสำหรับคอร์ส ${course.courseName}`,
        status: 'ACTIVE',
        timeLimit: 10,
        passingScore: 70,
        sections: {
          create: [
            {
              title: 'Core Understanding',
              description: 'วัดความเข้าใจภาพรวมของผู้เรียน',
              order: 0,
              dimension: course.category,
              questions: {
                create: prompts.map((prompt, index) => ({
                  prompt,
                  type: TestQuestionType.MULTIPLE_CHOICE,
                  difficulty: DifficultyLevel.MEDIUM,
                  order: index,
                  choices: {
                    create: [
                      {
                        text: 'คำตอบที่สอดคล้องกับแนวคิดหลักของบทเรียน',
                        isCorrect: true,
                        order: 0,
                      },
                      {
                        text: 'คำตอบที่ใกล้เคียงแต่ยังไม่ครบถ้วน',
                        order: 1,
                      },
                      {
                        text: 'คำตอบที่หลุดประเด็นจากบทเรียน',
                        order: 2,
                      },
                    ],
                  },
                })),
              },
            },
          ],
        },
      },
      include: {
        sections: {
          include: {
            questions: {
              include: { choices: true },
            },
          },
        },
      },
    });
  }
}
