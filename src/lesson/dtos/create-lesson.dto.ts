import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { LessonType } from 'src/database/generated/prisma/enums';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsString()
  video?: string;

  @IsString()
  docs?: string;
}
