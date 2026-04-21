import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [DatabaseModule, ChatbotModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
