import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../database/generated/prisma/client';

@Injectable()
export class AiCourseBuilderService {
  private readonly logger = new Logger(AiCourseBuilderService.name);

  constructor(private prisma: PrismaService) {}

  generateFullCourseOutline(input: {
    title: string;
    category: string;
    difficulty: string;
    targetAge: string;
    goal: string;
  }) {
    // Use exact prompt from task spec
    const prompt = `
คุณคือ AI Assistant ของผู้สอนบน LEARNEY

ข้อมูล:
- ชื่อคอร์ส: ${input.title}
- หมวดหมู่: ${input.category}
- ระดับ: ${input.difficulty}
- กลุ่มเป้าหมาย: ${input.targetAge}
- เป้าหมายของคอร์ส: ${input.goal}

ให้สร้าง:
1. คำอธิบายคอร์ส
2. จุดเด่นของคอร์ส 5 ข้อ
3. Lesson 8-12 บท
4. Quiz 3 ข้อต่อบท
5. โปรเจกต์ท้ายคอร์ส
6. คำแนะนำว่าควรเชื่อมกับคอร์สไหนต่อ
7. วิดีโอ YouTube ฟรีที่เกี่ยวข้อง 3 รายการ
8. Thumbnail Prompt สำหรับ AI Image
9. ใช้ภาษาไทย อ่านง่าย ทันสมัย และเหมาะกับวัยรุ่นหรือวัยทำงาน
`;

    // Mock Gemini response (replace with real Gemini API call)
    this.logger.log(
      `Generating course outline with prompt: ${prompt.substring(0, 100)}...`,
    );

    return {
      description:
        'คอร์สนี้จะช่วยให้คุณเข้าใจและใช้งานได้จริง ผ่านตัวอย่างและโปรเจกต์ที่ทำตามได้ทันที',
      highlights: [
        'เนื้อหาอัพเดทล่าสุด 2026',
        'สอนโดยผู้เชี่ยวชาญ มีประสบการณ์จริง',
        'มี Quiz ทุกบท + โปรเจกต์ท้ายคอร์ส',
        'ใช้เครื่องมือฟรีทั้งหมด',
        'มีวิดีโอตัวอย่างจาก YouTube',
      ],
      lessons: [
        { id: '1', title: 'บทนำ: เข้าใจพื้นฐาน', duration: 15, quizCount: 3 },
        { id: '2', title: 'เครื่องมือหลัก', duration: 25, quizCount: 3 },
        // ... 8-12 lessons
      ].concat(
        Array.from({ length: 10 }, (_, i) => ({
          id: `${i + 3}`,
          title: `บทที่ ${i + 3}: Advanced Topic ${i + 3}`,
          duration: 30 + i * 5,
          quizCount: 3,
        })),
      ),
      finalProject: 'สร้างโปรเจกต์จริง: [description]',
      nextCourses: ['Next.js Advanced', 'AI Marketing'],
      youtubeVideos: [
        'https://youtube.com/watch?v=ai-intro-2026',
        'https://youtube.com/watch?v=gemini-free-tutorial',
        'https://youtube.com/watch?v=chatgpt-money-making',
      ],
      thumbnailPrompt:
        'Modern Thai course thumbnail for ' +
        input.title +
        ', vibrant colors, professional',
      language: 'th',
    };
  }

  async createAiCourseDraft(
    userId: string,
    aiOutline: {
      title: string;
      description: string;
      category?: string;
      thumbnail?: string;
      lessons: Array<{ id: string; title: string; duration: number }>;
    },
  ) {
    const course = await this.prisma.course.create({
      data: {
        courseName: aiOutline.title,
        description: aiOutline.description,
        instructorId: userId,
        sourceType: 'AI_GENERATED' as const,
        workflowStatus: 'AI_GENERATED' as const,
        category: aiOutline.category || 'AI_TECH',
        thumbnail:
          aiOutline.thumbnail ||
          'https://placehold.co/1200x675/png?text=Learney+Course',
        price: 1990,
      },
    });

    // Create lessons
    for (const lesson of aiOutline.lessons.slice(0, 5)) {
      // First 5
      await this.prisma.courseLesson.create({
        data: {
          courseId: course.id,
          title: { th: lesson.title },
          durationMinutes: lesson.duration,
          order: parseInt(lesson.id, 10),
          published: false,
        },
      });
    }

    // Log AI job
    await this.prisma.aiGenerationJob.create({
      data: {
        createdById: userId,
        courseId: course.id,
        type: 'COURSE_BLUEPRINT' as const,
        promptContext: Prisma.JsonNull,
        result: aiOutline,
        status: 'AI_GENERATED' as const,
      },
    });

    return course;
  }
}
