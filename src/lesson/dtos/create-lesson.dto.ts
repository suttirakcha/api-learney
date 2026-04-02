import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { LessonType } from 'src/database/generated/prisma/enums';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(LessonType)
  @IsNotEmpty()
  type: LessonType;

  @IsString()
  @ValidateIf((value: CreateLessonDto) => value.type === LessonType.VIDEO)
  @IsNotEmpty()
  video: string;

  @IsString()
  @ValidateIf((value: CreateLessonDto) => value.type === LessonType.DOCS)
  @IsNotEmpty()
  docs: string;
}
