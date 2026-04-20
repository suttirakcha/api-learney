import {
  IsArray,
  IsOptional,
  IsString,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CareerAnswerItemDto {
  @IsString({ message: 'questionId ต้องเป็น string' })
  questionId: string;

  @IsOptional()
  @IsString()
  optionId?: string;

  @IsOptional()
  @IsInt()
  ratingValue?: number;
}

export class SubmitCareerAssessmentDto {
  @IsString({ message: 'sessionId จำเป็นต้องมี' })
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerAnswerItemDto)
  answers: CareerAnswerItemDto[];
}
