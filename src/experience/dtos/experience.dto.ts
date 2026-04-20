import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  rating?: string;

  @IsOptional()
  @IsString()
  promotion?: string;

  @IsOptional()
  @IsString()
  instructor?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  page?: string;
}

export class CreateThreadDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsIn(['discussion', 'question', 'DISCUSSION', 'QUESTION'])
  type?: string;

  @IsOptional()
  @IsObject()
  title?: Record<string, string>;

  @IsObject()
  content: Record<string, string>;
}

export class CreateReplyDto {
  @IsObject()
  content: Record<string, string>;
}

export class ReportContentDto {
  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsString()
  replyId?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class SkillAnswerDto {
  @IsString()
  category: string;

  @IsString()
  questionId: string;

  @IsString()
  value: string;
}

export class CreateSkillAttemptDto {
  @IsString()
  ageGroup: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  assessmentKind?: string;

  @IsOptional()
  @IsString()
  interest?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillAnswerDto)
  answers: SkillAnswerDto[];
}

export class AdminConsoleActionDto {
  @IsString()
  action: string;

  @IsOptional()
  payload?: Record<string, unknown>;
}
