import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { StartChatSessionDto, SendMessageDto } from './dto/chat.dto';
import { PrismaClient } from '../database/generated/prisma/client';

@Controller('chatbot')
export class ChatbotController {
  private prisma = new PrismaClient();
  constructor(private chatbotService: ChatbotService) {}

  @Get('settings/public')
  getSettings() {
    return this.chatbotService.getPublicSettings();
  }

  @Get('suggested-questions')
  getSuggestedQuestions() {
    return this.prisma.suggestedQuestion.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Post('session')
  async startSession(@Body() dto: StartChatSessionDto, @Req() req: any) {
    const userId = req.user?.id; // Optional: If JWT Guard is applied loosely
    const session = await this.chatbotService.startSession(
      userId,
      dto.guestToken,
    );

    // Return session along with recent history
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });

    return { session, messages };
  }

  @Post('message')
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.chatbotService.handleUserMessage(dto.sessionId, dto.message);
  }
}
