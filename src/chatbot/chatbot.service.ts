import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';

type ChatbotSettings = {
  isEnabled: boolean;
  welcomeMessage: string;
  fallbackMessage: string;
  offlineMessage: string;
  primaryColor: string;
  allowGuestChat: boolean;
  saveHistory: boolean;
  maxMessagesPerSession: number;
};

@Injectable()
export class ChatbotService {
  constructor(private readonly prisma: PrismaService) {}

  private buildEphemeralMessage(
    sessionId: string,
    senderType: 'BOT' | 'SYSTEM' | 'USER',
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    return {
      id: randomUUID(),
      sessionId,
      senderType,
      message,
      metadata: metadata ?? null,
      createdAt: new Date(),
    };
  }

  private buildEphemeralSession(userId: string | null, guestToken?: string) {
    const id = guestToken ?? randomUUID();
    const timestamp = new Date();

    return {
      id,
      userId,
      guestToken: userId ? null : (guestToken ?? id),
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
      lastMessageAt: timestamp,
      messages: [] as Array<ReturnType<typeof this.buildEphemeralMessage>>,
    };
  }

  private getDefaultSettings(): ChatbotSettings {
    return {
      isEnabled: true,
      welcomeMessage:
        'สวัสดีครับ ผมคือ Learney AI พร้อมช่วยแนะนำคอร์สและวางเส้นทางการเรียนให้คุณ',
      fallbackMessage:
        'ผมสรุปให้สั้นๆ ก่อนนะครับ ลองบอกเป้าหมายหรือทักษะที่อยากพัฒนาเพิ่มอีกนิด แล้วผมจะช่วยแนะนำต่อให้ตรงขึ้น',
      offlineMessage:
        'ตอนนี้ผู้ช่วยกำลังพักสั้นๆ อยู่ครับ ลองส่งข้อความใหม่อีกครั้งได้เลย',
      primaryColor: '#4fd6f0',
      allowGuestChat: true,
      saveHistory: true,
      maxMessagesPerSession: 100,
    };
  }

  private normalizeText(value: string) {
    return value.toLowerCase().trim();
  }

  private extractKeywords(message: string) {
    return [
      ...new Set(
        this.normalizeText(message)
          .split(/[^a-z0-9ก-๙]+/i)
          .filter(Boolean),
      ),
    ];
  }

  async getPublicSettings() {
    try {
      const settings = await this.prisma.chatbotSetting.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      return settings ?? this.getDefaultSettings();
    } catch (error) {
      console.warn(
        'Unable to load chatbot settings, using default settings instead.',
        error,
      );
      return this.getDefaultSettings();
    }
  }

  async getSuggestedQuestions() {
    try {
      const questions = await this.prisma.suggestedQuestion.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 6,
      });

      if (questions.length > 0) {
        return questions;
      }
    } catch (error) {
      console.warn(
        'Unable to load suggested chatbot questions, using fallback prompts.',
        error,
      );
    }

    return [
      {
        id: 'fallback-1',
        question: 'อยากเริ่มเรียน AI ควรเริ่มจากคอร์สไหน?',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
      },
      {
        id: 'fallback-2',
        question: 'ถ้าอยากย้ายสายเป็น Data Analyst ต้องฝึกอะไรบ้าง?',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
      },
      {
        id: 'fallback-3',
        question: 'ช่วยแนะนำคอร์สสำหรับมือใหม่หน่อย',
        isActive: true,
        sortOrder: 2,
        createdAt: new Date(),
      },
    ];
  }

  async startSession(userId: string | null, guestToken?: string) {
    const settings = await this.getPublicSettings();

    try {
      const session =
        (userId
          ? await this.prisma.chatSession.findFirst({
              where: { userId, status: 'ACTIVE' },
              orderBy: { updatedAt: 'desc' },
              include: {
                messages: { orderBy: { createdAt: 'asc' }, take: 50 },
              },
            })
          : guestToken
            ? await this.prisma.chatSession.findFirst({
                where: { guestToken, status: 'ACTIVE' },
                orderBy: { updatedAt: 'desc' },
                include: {
                  messages: { orderBy: { createdAt: 'asc' }, take: 50 },
                },
              })
            : null) ??
        (await this.prisma.chatSession.create({
          data: {
            userId,
            guestToken: userId ? null : (guestToken ?? randomUUID()),
          },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
        }));

      if (session.messages.length === 0) {
        const welcomeMessage = await this.prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            senderType: 'BOT',
            message: settings.welcomeMessage,
          },
        });

        return {
          session,
          messages: [welcomeMessage],
        };
      }

      return {
        session,
        messages: session.messages,
      };
    } catch (error) {
      console.warn(
        'Unable to persist chatbot session, using ephemeral session instead.',
        error,
      );

      const session = this.buildEphemeralSession(userId, guestToken);
      const welcomeMessage = this.buildEphemeralMessage(
        session.id,
        'BOT',
        settings.welcomeMessage,
      );

      return {
        session,
        messages: [welcomeMessage],
      };
    }
  }

  private async buildReply(message: string) {
    const normalized = this.normalizeText(message);
    const keywords = this.extractKeywords(message);

    let faq = null;

    try {
      faq = await this.prisma.fAQ.findFirst({
        where: {
          isPublished: true,
          OR: [
            { question: { contains: message, mode: 'insensitive' } },
            { keywords: { hasSome: keywords } },
          ],
        },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
    } catch (error) {
      console.warn(
        'Unable to search FAQ content for chatbot, falling back to static reply.',
        error,
      );
    }

    if (faq) {
      return {
        text: faq.answer,
        intent: 'faq',
        matchedSource: faq.question,
      };
    }

    let courses: Array<{
      id: string;
      slug: string | null;
      courseName: string;
      level: string | null;
      category: string;
    }> = [];

    if (keywords.length > 0) {
      try {
        courses = await this.prisma.course.findMany({
          where: {
            OR: [
              { courseName: { contains: message, mode: 'insensitive' } },
              { description: { contains: message, mode: 'insensitive' } },
              { category: { contains: message, mode: 'insensitive' } },
              { tags: { hasSome: keywords } },
            ],
          },
          orderBy: [
            { isFeatured: 'desc' },
            { isPopular: 'desc' },
            { updatedAt: 'desc' },
          ],
          take: 3,
          select: {
            id: true,
            slug: true,
            courseName: true,
            level: true,
            category: true,
          },
        });
      } catch (error) {
        console.warn(
          'Unable to load chatbot course suggestions, continuing without course matches.',
          error,
        );
      }
    }

    if (courses.length > 0) {
      const intro =
        normalized.includes('อาชีพ') || normalized.includes('career')
          ? 'ถ้าเป้าหมายของคุณเชื่อมกับสายอาชีพนี้ ผมแนะนำให้เริ่มจากคอร์สเหล่านี้ครับ'
          : 'ผมหาคอร์สที่ใกล้กับสิ่งที่คุณถามมาให้แล้วครับ';

      const lines = courses.map(
        (course, index) =>
          `${index + 1}. ${course.courseName} (${course.level ?? 'All levels'})`,
      );

      return {
        text: `${intro}\n${lines.join('\n')}`,
        intent: 'course_recommendation',
        matchedSource: courses[0].courseName,
        metadata: {
          courses: courses.map((course) => ({
            id: course.id,
            slug: course.slug,
            title: course.courseName,
            level: course.level,
            category: course.category,
          })),
        },
      };
    }

    if (normalized.includes('เริ่ม') || normalized.includes('beginner')) {
      return {
        text: 'ถ้าเพิ่งเริ่ม แนะนำให้เลือกคอร์สพื้นฐาน 1 คอร์ส + ทำ Skill Test ก่อนครับ แล้วค่อยขยับไปคอร์สที่เฉพาะทางขึ้น',
        intent: 'learning_path',
        matchedSource: 'starter-path',
      };
    }

    return {
      text: 'เล่าเพิ่มได้เลยครับว่าอยากพัฒนาทักษะด้านไหน หรือกำลังเล็งอาชีพอะไรอยู่ ผมจะช่วยแนะนำคอร์สกับเส้นทางเรียนให้ตรงขึ้น',
      intent: 'general_guidance',
      matchedSource: 'fallback',
    };
  }

  async handleMessage(userId: string | null, dto: ChatbotMessageDto) {
    const settings = await this.getPublicSettings();
    const fallbackSessionId = dto.sessionId ?? randomUUID();

    try {
      const session = dto.sessionId
        ? await this.prisma.chatSession.upsert({
            where: { id: dto.sessionId },
            update: { userId, lastMessageAt: new Date() },
            create: { id: dto.sessionId, userId },
          })
        : (await this.startSession(userId)).session;

      const messageCount = await this.prisma.chatMessage.count({
        where: { sessionId: session.id },
      });

      if (messageCount >= settings.maxMessagesPerSession) {
        return this.prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            senderType: 'SYSTEM',
            message: settings.offlineMessage,
          },
        });
      }

      await this.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          senderType: 'USER',
          message: dto.message,
        },
      });

      const reply = await this.buildReply(dto.message);

      await this.prisma.chatbotIntentLog.create({
        data: {
          sessionId: session.id,
          userMessage: dto.message,
          detectedIntent: reply.intent,
          matchedSource: reply.matchedSource,
        },
      });

      await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { lastMessageAt: new Date() },
      });

      return this.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          senderType: 'BOT',
          message: reply.text || settings.fallbackMessage,
          metadata: reply.metadata,
        },
      });
    } catch (error) {
      console.warn(
        'Unable to persist chatbot message flow, returning ephemeral response.',
        error,
      );

      const reply = await this.buildReply(dto.message);

      return this.buildEphemeralMessage(
        fallbackSessionId,
        'BOT',
        reply.text || settings.fallbackMessage,
        reply.metadata,
      );
    }
  }
}
