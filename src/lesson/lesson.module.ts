import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  imports: [DatabaseModule, UploadModule],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}
