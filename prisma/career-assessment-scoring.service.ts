import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../database/generated/prisma/client';
import OpenAI from 'openai';

@Injectable()
export class CareerAssessmentScoringService {
  private prisma = new PrismaClient();
  private logger = new Logger(CareerAssessmentScoringService.name);
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async evaluateSession(sessionId: string) {
    // 1. ดึงข้อมูลคำตอบทั้งหมด
    const session = await this.prisma.careerAssessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: { include: { question: true, option: true } },
      },
    });

    if (!session) throw new Error('ไม่พบ Session การทำแบบประเมิน');

    // 2. คำนวณคะแนนตาม Category (Raw Score & Max Score)
    const categoryRawScores: Record<string, { score: number; max: number }> =
      {};

    for (const answer of session.answers) {
      const cat = answer.question.category;
      if (!categoryRawScores[cat]) {
        categoryRawScores[cat] = { score: 0, max: 0 };
      }

      // สมมติว่าคะแนนเต็มต่อข้อคือ 5 (Rating Scale) หรือ Max Weight ของ Option
      const maxPossible = 5;
      let earned = 0;

      if (answer.question.type === 'RATING_SCALE' && answer.ratingValue) {
        earned = answer.ratingValue;
      } else if (answer.option) {
        earned = answer.option.weight;
      }

      categoryRawScores[cat].score += earned;
      categoryRawScores[cat].max += maxPossible;
    }

    // Normalization: แปลงคะแนนแต่ละด้านให้อยู่ในสเกล 0-100
    const normalizedScores: Record<string, number> = {};
    for (const cat in categoryRawScores) {
      const { score, max } = categoryRawScores[cat];
      normalizedScores[cat] = max > 0 ? (score / max) * 100 : 0;
    }

    // 3. ดึง Career Mapping ทั้งหมดมาคำนวณ Match Percentage
    // สมมติว่า CareerMapping เก็บ requiredWeight (0-100) ของแต่ละทักษะ
    const careers = await this.prisma.career.findMany({
      include: { mappings: true },
    });

    const careerMatches = careers.map((career) => {
      let totalDifference = 0;
      let maxDifference = 0;

      career.mappings.forEach((mapping) => {
        const userScore = normalizedScores[mapping.category] || 0;
        const requiredScore = mapping.requiredWeight * 100; // แปลงเป็น 0-100

        // ยิ่งคะแนนผู้ใช้ใกล้เคียง requirement ยิ่งดี (ใช้ Absolute Difference)
        const diff = Math.abs(userScore - requiredScore);
        totalDifference += diff;
        maxDifference += 100;
      });

      // ถ้ายิ่ง diff น้อย แปลว่า Match เยอะ
      const matchPercentage =
        maxDifference > 0
          ? Math.max(0, 100 - (totalDifference / maxDifference) * 100)
          : 0;

      return { career, matchPercentage };
    });

    // เรียงลำดับและเอา Top 3
    const topCareers = careerMatches
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 3);

    // 4. หา Recommended Courses ที่ตรงกับอาชีพ (ดึงจาก Course ที่มี tags ตรงกับ RequiredSkills)
    const topCareer = topCareers[0].career;
    const recommendedCourses = await this.prisma.course.findMany({
      where: {
        isPublished: true,
        tags: { hasSome: topCareer.requiredSkills },
      },
      take: 4,
      orderBy: { learnerCount: 'desc' },
    });

    // 5. Generate AI Summary, Strengths, Improvements, Learning Path
    const aiResult = await this.generateAiInsights(
      normalizedScores,
      topCareers,
    );

    // 6. บันทึกผลลัพธ์ลง Database
    const resultRecord = await this.prisma.careerAssessmentResult.create({
      data: {
        sessionId: session.id,
        aiSummary: aiResult.summary,
        strengths: aiResult.strengths,
        improvements: aiResult.improvements,
        learningPath: aiResult.learningPath,
        categoryScores: {
          create: Object.entries(normalizedScores).map(([cat, score]) => ({
            category: cat,
            score,
          })),
        },
        recommendedCareers: {
          create: topCareers.map((tc, index) => ({
            careerId: tc.career.id,
            matchPercentage: tc.matchPercentage,
            rank: index + 1,
          })),
        },
        recommendedCourses: {
          create: recommendedCourses.map((course) => ({
            courseId: course.id,
            reason: `คอร์สนี้ตรงกับทักษะหลักที่ ${topCareer.name['th'] || topCareer.slug} จำเป็นต้องใช้`,
          })),
        },
      },
    });

    // อัปเดตสถานะ Session
    await this.prisma.careerAssessmentSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' },
    });

    return resultRecord;
  }

  private async generateAiInsights(
    scores: Record<string, number>,
    topCareers: any[],
  ) {
    try {
      this.logger.log('Generating Career Insights via OpenAI...');

      const systemPrompt = `คุณคือ Career Advisor ประจำแพลตฟอร์ม LEARNEY
วิเคราะห์คะแนนทักษะและอาชีพที่แนะนำ เพื่อตอบกลับเป็น JSON Format:
{
  "summary": "สรุปผลลัพธ์เชิงบวก ภาษาไทย 3-4 ประโยคว่าทำไมอาชีพเหล่านี้ถึงเหมาะกับเขา",
  "strengths": ["จุดแข็งที่ 1", "จุดแข็งที่ 2"],
  "improvements": ["ทักษะที่ควรพัฒนา 1", "ทักษะที่ควรพัฒนา 2"],
  "learningPath": [
    {"step": 1, "title": "ปูพื้นฐาน", "desc": "..."},
    {"step": 2, "title": "ลงมือทำ", "desc": "..."}
  ]
}`;
      const userContext = JSON.stringify({
        skillScores: scores,
        topRecommendedCareers: topCareers.map((c) => c.career.slug),
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContext },
        ],
        temperature: 0.7,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      this.logger.error('OpenAI Error in Career Assessment', error);
      // Fallback
      return {
        summary:
          'จากผลประเมิน คุณมีแนวโน้มความถนัดที่สอดคล้องกับอาชีพในสายเทคโนโลยีและการวิเคราะห์ ระบบได้จัดเตรียมเส้นทางการเรียนรู้ที่เหมาะสมไว้ให้คุณแล้ว',
        strengths: [
          'ความสามารถในการเรียนรู้สิ่งใหม่',
          'การคิดวิเคราะห์เบื้องต้น',
        ],
        improvements: [
          'ทักษะเชิงลึกในสายงานเฉพาะทาง',
          'การประยุกต์ใช้เครื่องมือขั้นสูง',
        ],
        learningPath: [
          {
            step: 1,
            title: 'สำรวจความสนใจ',
            desc: 'เรียนรู้ภาพรวมของสายอาชีพ',
          },
          {
            step: 2,
            title: 'เสริมทักษะหลัก',
            desc: 'ลงเรียนคอร์สพื้นฐานที่จำเป็น',
          },
        ],
      };
    }
  }
}
