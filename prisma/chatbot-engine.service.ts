import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '../database/generated/prisma/client';

@Injectable()
export class ChatbotEngineService {
  private prisma = new PrismaClient();
  private logger = new Logger(ChatbotEngineService.name);

  // ฟังก์ชันหลักสำหรับประมวลผลข้อความและตอบกลับ
  async processMessage(sessionId: string, userMessage: string) {
    const intent = this.detectIntent(userMessage);
    let botReply = '';
    let messageType: 'TEXT' | 'COURSE_CARD' | 'ACTION_LINK' = 'TEXT';
    let metadata: any = null;
    let matchedSource = 'rule-based';

    this.logger.log(`Detected Intent: ${intent} for message: "${userMessage}"`);

    try {
      switch (intent) {
        case 'course_recommendation':
          const courses = await this.searchCourses(userMessage);
          if (courses.length > 0) {
            botReply = `นี่คือคอร์สเรียนที่เกี่ยวข้องกับ "${userMessage}" ที่ผมแนะนำครับ:`;
            messageType = 'COURSE_CARD';
            metadata = {
              courses: courses.map((c) => ({
                id: c.id,
                name: c.courseName,
                price: c.price,
                image: c.thumbnail,
                slug: c.slug,
              })),
            };
            matchedSource = 'database_course';
          } else {
            botReply =
              'ขออภัยครับ ตอนนี้ผมยังไม่พบคอร์สที่ตรงกับความต้องการ ลองค้นหาด้วยคำอื่นดูนะครับ';
          }
          break;

        case 'pricing':
        case 'promotion':
          const activePromos = await this.prisma.promotion.findMany({
            where: { active: true },
            take: 3,
          });
          if (activePromos.length > 0) {
            botReply =
              'ตอนนีัเรามีโปรโมชันที่น่าสนใจดังนี้ครับ:\n' +
              activePromos
                .map(
                  (p) => `- ${p.title['th']} (โค้ด: ${p.promoCode || 'ไม่มี'})`,
                )
                .join('\n');
            matchedSource = 'database_promotion';
          } else {
            botReply =
              'ขณะนี้ยังไม่มีโปรโมชันพิเศษครับ แต่คอร์สของเรามีราคาที่คุ้มค่ามากเลยนะครับ';
          }
          break;

        case 'faq':
          const faq = await this.searchFAQ(userMessage);
          if (faq) {
            botReply = faq.answer;
            matchedSource = 'database_faq';
          } else {
            intent = 'unknown'; // Fallback
          }
          break;

        case 'payment_help':
          botReply =
            'คุณสามารถชำระเงินผ่านบัตรเครดิต, สแกน QR Code หรือโอนเงินผ่านธนาคารได้ครับ หากมีปัญหาการชำระเงิน สามารถติดต่อแอดมินได้โดยตรงครับ';
          break;

        default:
          intent = 'unknown';
          break;
      }

      // Fallback Response
      if (intent === 'unknown') {
        const settings = await this.prisma.chatbotSetting.findFirst();
        botReply =
          settings?.fallbackMessage ||
          'ขออภัยครับ ผมยังไม่เข้าใจคำถามนี้ชัดเจนนัก คุณสามารถลองพิมพ์สั้นๆ หรือเลือกคำถามจากเมนูแนะนำได้ครับ';
        matchedSource = 'fallback';
      }

      // บันทึก Log การทำงานของบอท
      await this.prisma.chatbotIntentLog.create({
        data: {
          sessionId,
          userMessage,
          detectedIntent: intent,
          matchedSource,
          confidence: 0.85,
        },
      });

      return { reply: botReply, messageType, metadata };
    } catch (error) {
      this.logger.error('Error processing chatbot message', error);
      return {
        reply: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ',
        messageType: 'TEXT',
        metadata: null,
      };
    }
  }

  // ----------------------------------------------------
  // Helper Functions
  // ----------------------------------------------------

  // 1. ตรวจจับ Intent (สามารถต่อยอดเชื่อม OpenAI/Gemini ได้ที่นี่)
  private detectIntent(message: string): string {
    const msg = message.toLowerCase();

    if (msg.match(/คอร์ส|เรียน|แนะนำ|มีอะไร/)) return 'course_recommendation';
    if (msg.match(/ราคา|กี่บาท|แพง/)) return 'pricing';
    if (msg.match(/โปรโมชั่น|ส่วนลด|โปร|ลดราคา/)) return 'promotion';
    if (msg.match(/จ่ายเงิน|โอนเงิน|บัตรเครดิต|ชำระ/)) return 'payment_help';
    if (msg.match(/หมวดหมู่|สายงาน|ด้านไหน/)) return 'category_info';
    if (msg.match(/สวัสดี|ทักทาย|ดีจ้า/)) return 'greeting';

    return 'faq';
  }

  // 2. ค้นหาคอร์สที่สอดคล้องกับ Keyword
  private async searchCourses(keyword: string) {
    // ทำ Clean keyword เอาคำทั่วๆไปออก
    const searchWords = keyword
      .replace(/แนะนำ|คอร์ส|เรียน|หน่อย|อยาก/g, '')
      .trim()
      .split(' ')
      .filter((w) => w.length > 1);

    if (searchWords.length === 0) {
      return this.prisma.course.findMany({
        where: { isPublished: true, status: 'ACTIVE' },
        take: 3,
        orderBy: { learnerCount: 'desc' },
      });
    }

    // ค้นหาแบบ Full-text อย่างง่ายด้วย OR conditions
    return this.prisma.course.findMany({
      where: {
        isPublished: true,
        status: 'ACTIVE',
        OR: searchWords.map((word) => ({
          OR: [
            { courseName: { contains: word, mode: 'insensitive' } },
            { description: { contains: word, mode: 'insensitive' } },
            { tags: { has: word } },
          ],
        })),
      },
      take: 3,
      orderBy: { learnerCount: 'desc' }, // เอาคอร์สยอดนิยมขึ้นก่อน
    });
  }

  // 3. ค้นหาจากฐานข้อมูล FAQ
  private async searchFAQ(keyword: string) {
    const searchWords = keyword.split(' ').filter((w) => w.length > 2);
    if (searchWords.length === 0) return null;

    // ค้นหาคำถามที่มี Keyword ตรง
    const faqs = await this.prisma.fAQ.findMany({
      where: { isPublished: true },
    });

    for (const faq of faqs) {
      // ตรวจสอบว่า keyword ในคำถามของผู้ใช้ ตรงกับ keywords ที่ตั้งไว้ใน FAQ หรือไม่
      const isMatch =
        faq.keywords.some((kw) =>
          keyword.toLowerCase().includes(kw.toLowerCase()),
        ) || faq.question.toLowerCase().includes(searchWords[0].toLowerCase());
      if (isMatch) return faq;
    }
    return null;
  }
}
