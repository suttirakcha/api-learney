import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '../database/generated/prisma/client';
import { ChatbotEngineService } from './chatbot-engine.service';

@Injectable()
export class ChatbotService {
  private prisma = new PrismaClient();

  constructor(private engine: ChatbotEngineService) {}

  // ดึงตั้งค่า Public สำหรับหน้าแรก
  async getPublicSettings() {
    let settings = await this.prisma.chatbotSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.chatbotSetting.create({
        data: {
          welcomeMessage:
            'สวัสดีครับ LEARNEY AI Assistant ยินดีให้บริการ มีอะไรให้ผมช่วยไหมครับ?',
          fallbackMessage: 'ขออภัยครับ ผมยังไม่เข้าใจคำถามนี้',
        },
      });
    }
    return settings;
  }

  // เริ่ม Session แชตใหม่ หรือโหลดของเดิมสำหรับ Guest
  async startSession(userId?: string, guestToken?: string) {
    let session;

    if (userId) {
      session = await this.prisma.chatSession.findFirst({
        where: { userId, status: 'ACTIVE' },
      });
    } else if (guestToken) {
      session = await this.prisma.chatSession.findFirst({
        where: { guestToken, status: 'ACTIVE' },
      });
    }

    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { userId, guestToken, status: 'ACTIVE' },
      });

      // บันทึกข้อความต้อนรับ
      const settings = await this.getPublicSettings();
      await this.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          senderType: 'BOT',
          message: settings.welcomeMessage,
        },
      });
    }

    return session;
  }

  // ส่งข้อความหา Bot
  async handleUserMessage(sessionId: string, message: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== 'ACTIVE')
      throw new NotFoundException('Chat session is closed or not found');

    // 1. บันทึกข้อความของผู้ใช้
    await this.prisma.chatMessage.create({
      data: { sessionId, senderType: 'USER', message },
    });

    // 2. นำไปประมวลผลหาคำตอบด้วย Engine
    const botResponse = await this.engine.processMessage(sessionId, message);

    // 3. บันทึกข้อความของบอท
    const botMessageRecord = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderType: 'BOT',
        message: botResponse.reply,
        messageType: botResponse.messageType as any,
        metadata: botResponse.metadata,
      },
    });

    // 4. อัปเดตเวลาล่าสุด
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { lastMessageAt: new Date() },
    });

    return botMessageRecord;
  }
}
