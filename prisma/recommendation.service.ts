import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../database/generated/prisma/client';
import { AnalyzeRecommendationDto } from './dto/analyze-recommendation.dto';
import OpenAI from 'openai';

@Injectable()
export class RecommendationService {
  private prisma = new PrismaClient();
  private logger = new Logger(RecommendationService.name);
  // แนะนำให้ดึงจาก ConfigService ในการใช้งานจริง (process.env.OPENAI_API_KEY)
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async analyze(dto: AnalyzeRecommendationDto, userId?: string) {
    // 1. ดึงคอร์สทั้งหมดที่เปิดสอน (Published)
    const courses = await this.prisma.course.findMany({
      where: { isPublished: true, status: 'ACTIVE' },
      include: { categoryRecord: true, instructor: true },
    });

    // 2. คำนวณคะแนนให้แต่ละคอร์ส (Scoring Algorithm)
    const scoredCourses = courses.map((course) => {
      let score = 0;
      let reasonMatches = [];

      // อาชีพเป้าหมายตรงกับหมวดหมู่คอร์ส (30%)
      if (dto.targetCareer && course.categoryRecord?.name) {
        const catName = JSON.stringify(
          course.categoryRecord.name,
        ).toLowerCase();
        if (catName.includes(dto.targetCareer.toLowerCase())) {
          score += 30;
          reasonMatches.push('ตรงกับสายอาชีพเป้าหมายของคุณ');
        }
      }

      // ความสนใจตรงกับ Tags ของคอร์ส (25%)
      if (dto.interests && dto.interests.length > 0) {
        const matchCount = dto.interests.filter((i) =>
          course.tags.includes(i),
        ).length;
        if (matchCount > 0) {
          score += 25;
          reasonMatches.push('ครอบคลุมหัวข้อที่คุณสนใจ');
        }
      }

      // ทักษะที่อยากพัฒนาตรงกับคอร์ส (20%) - สมมติว่า tags หรือ requirements บ่งบอกทักษะ
      if (dto.desiredSkills && dto.desiredSkills.length > 0) {
        const skillMatch = dto.desiredSkills.some(
          (s) =>
            course.tags.includes(s) || course.title?.toString().includes(s),
        );
        if (skillMatch) {
          score += 20;
          reasonMatches.push('ช่วยพัฒนาทักษะที่คุณต้องการ');
        }
      }

      // ระดับความยากตรงกัน (10%)
      if (dto.experienceLevel && course.level === dto.experienceLevel) {
        score += 10;
        reasonMatches.push('ระดับความยากเหมาะสมกับคุณ');
      }

      // งบประมาณตรง (10%)
      if (dto.budget) {
        const price = Number(course.price);
        if (price <= dto.budget) {
          score += 10;
          reasonMatches.push('อยู่ในงบประมาณที่คุณตั้งไว้');
        } else if (price <= dto.budget + 2000) {
          score += 5; // เกินงบนิดหน่อย
        }
      }

      // เวลาที่มี (5%) - อนุมานจาก studyHoursPerWeek
      if (dto.studyHoursPerWeek && course.duration) {
        score += 5;
        reasonMatches.push('ใช้เวลาเรียนสอดคล้องกับตารางของคุณ');
      }

      // Normalize score ให้ไม่เกิน 100
      score = Math.min(score > 0 ? score + Math.random() * 5 : 0, 99.9); // แอบบวก random เล็กน้อยให้คะแนนดูไม่เป็นเลขกลมๆ

      return {
        course,
        score,
        reason:
          reasonMatches.length > 0
            ? `คอร์สนี้${reasonMatches.join(' และ')}`
            : 'คอร์สนี้มีเนื้อหาที่อาจเป็นประโยชน์ต่อการเรียนรู้ของคุณ',
      };
    });

    // 3. เรียงลำดับและเลือก Top 5
    const topRecommendations = scoredCourses
      .filter((c) => c.score > 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 4. สร้าง AI Summary ด้วย OpenAI แบบ Production-ready
    let aiSummary = '';
    try {
      this.logger.log('Generating AI Summary via OpenAI...');

      const systemPrompt = `คุณคือ AI Learning Advisor ประจำแพลตฟอร์มการเรียนรู้ออนไลน์ "LEARNEY"
กติกาในการตอบ:
1. ใช้ภาษาไทยที่ดูเป็นมืออาชีพ สุภาพ เป็นกันเอง นุ่มนวล และให้กำลังใจ (Positive, Premium, Soft & Friendly)
2. ความยาวประมาณ 3-4 ประโยค
3. ให้อธิบายภาพรวมว่าเส้นทางการเรียนรู้นี้ตอบโจทย์ความสนใจ ทักษะที่อยากพัฒนา หรืออาชีพเป้าหมายของพวกเขาอย่างไร
4. ห้ามลิสต์รายชื่อคอร์สทีละอัน ให้สรุปเป็นภาพรวมทักษะ
5. ตอบเป็น Text ธรรมดาเท่านั้น`;

      const userContext = JSON.stringify({
        learnerProfile: {
          currentCareer: dto.currentCareer,
          targetCareer: dto.targetCareer,
          interests: dto.interests,
          desiredSkills: dto.desiredSkills,
          studyHoursPerWeek: dto.studyHoursPerWeek,
          experienceLevel: dto.experienceLevel,
        },
        // ดึงเฉพาะชื่อคอร์สให้ AI ดูภาพรวม
        recommendedCourseThemes: topRecommendations.map(
          (r) => r.course.courseName,
        ),
      });

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // ใช้ mini เพื่อความรวดเร็วและประหยัด cost
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContext },
        ],
        temperature: 0.7, // ให้มีความคิดสร้างสรรค์กำลังดี ไม่แข็งเกินไป
      });
      aiSummary = completion.choices[0].message.content || '';
    } catch (error) {
      this.logger.warn(
        'OpenAI failed to generate summary, falling back to rule-based',
        error,
      );
      const topCategory =
        topRecommendations[0]?.course.categoryRecord?.name?.['th'] ||
        'สายงานดิจิทัล';
      aiSummary = `จากข้อมูลของคุณ คุณเหมาะกับสาย ${dto.targetCareer || topCategory} มากที่สุด เพราะคุณสนใจ ${dto.interests.slice(0, 2).join(' และ ')} ระบบได้จัดเรียงคอร์สที่จะช่วยให้คุณบรรลุเป้าหมายตามเวลาที่คุณมีได้อย่างตรงจุดที่สุดครับ`;
    }

    // 5. บันทึกลง Database
    const recommendationRecord = await this.prisma.userRecommendation.create({
      data: {
        userId,
        age: dto.age,
        educationLevel: dto.educationLevel,
        currentCareer: dto.currentCareer,
        targetCareer: dto.targetCareer,
        interests: dto.interests,
        currentSkills: dto.currentSkills || [],
        desiredSkills: dto.desiredSkills,
        learningStyle: dto.learningStyle,
        budget: dto.budget,
        studyHoursPerWeek: dto.studyHoursPerWeek,
        experienceLevel: dto.experienceLevel,
        aiSummary,
        recommendations: {
          create: topRecommendations.map((rec, index) => ({
            courseId: rec.course.id,
            score: Number(rec.score.toFixed(1)),
            reason: rec.reason,
            sortOrder: index + 1,
          })),
        },
      },
      include: {
        recommendations: {
          include: {
            course: {
              include: { instructor: true, categoryRecord: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return recommendationRecord;
  }

  async getRecommendationById(id: string) {
    const rec = await this.prisma.userRecommendation.findUnique({
      where: { id },
      include: {
        recommendations: {
          include: {
            course: { include: { instructor: true, categoryRecord: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!rec) throw new NotFoundException('ไม่พบข้อมูลการแนะนำคอร์สนี้');
    return rec;
  }

  async saveCourseFromRecommendation(
    recommendationId: string,
    courseId: string,
    userId?: string,
  ) {
    // 1. ตรวจสอบว่าผู้ใช้ Login แล้ว
    if (!userId) {
      throw new BadRequestException(
        'ผู้ใช้งานต้องเข้าสู่ระบบก่อนบันทึกคอร์สเรียน (Wishlist)',
      );
    }

    // 2. ตรวจสอบว่าคอร์สมีอยู่จริง
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('ไม่พบข้อมูลคอร์สเรียนนี้');

    // 3. ดึงหรือสร้างตาราง Wishlist ของผู้ใช้
    let wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({ data: { userId } });
    }

    // 4. ตรวจสอบว่าเคยบันทึกไว้ใน Wishlist แล้วหรือยัง
    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistCourseIdentifier: { wishlistId: wishlist.id, courseId },
      },
    });
    if (existingItem) return { message: 'คอร์สนี้อยู่ในรายการที่สนใจแล้ว' };

    // 5. บันทึกลงตาราง WishlistItem
    await this.prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, courseId },
    });

    return { message: 'บันทึกคอร์สเรียนสำเร็จ', success: true };
  }
}
