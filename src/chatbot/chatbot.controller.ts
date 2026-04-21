import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ChatbotService } from './chatbot.service';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('settings/public')
  getSettings() {
    return this.chatbotService.getPublicSettings();
  }

  @Get('suggested-questions')
  getSuggestedQuestions() {
    return this.chatbotService.getSuggestedQuestions();
  }

  @Post('session')
  startSession(@Req() req: Request, @Body('guestToken') guestToken?: string) {
    const userId = (req.user as { sub?: string } | undefined)?.sub ?? null;
    return this.chatbotService.startSession(userId, guestToken);
  }

  @Post('message')
  sendMessage(@Req() req: Request, @Body() dto: ChatbotMessageDto) {
    const userId = (req.user as { sub?: string } | undefined)?.sub ?? null;
    return this.chatbotService.handleMessage(userId, dto);
  }
}
