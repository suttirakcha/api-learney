import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LessonType } from 'src/database/generated/prisma/enums';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsString()
  docs?: string;
}
