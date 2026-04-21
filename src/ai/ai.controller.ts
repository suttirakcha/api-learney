import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AiService } from './ai.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { ChatbotMessageDto } from '../chatbot/dto/chatbot-message.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly chatbotService: ChatbotService,
  ) {}

  @Post('recommendations/generate')
  generateRecommendation(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const userId = (req.user as { sub?: string } | undefined)?.sub ?? null;
    return this.aiService.generateRecommendation(userId, body);
  }

  @Post('chatbot/message')
  chatMessage(@Req() req: Request, @Body() dto: ChatbotMessageDto) {
    const userId = (req.user as { sub?: string } | undefined)?.sub ?? null;
    return this.chatbotService.handleMessage(userId, dto);
  }

  @Post('admin/tests/generate')
  generateTest(
    @Body()
    body: {
      courseId: string;
      type: 'PRE_TEST' | 'POST_TEST';
    },
  ) {
    return this.aiService.generateCourseTest(body.courseId, body.type);
  }
}
