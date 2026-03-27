import { Controller, Get } from '@nestjs/common';

@Controller('lesson')
export class LessonController {
  @Get(':courseId')
  lesson() {}
}
