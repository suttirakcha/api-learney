import { IsString, IsArray, IsEnum, IsOptional } from 'class-validator';
import { TestQuestionType } from '../../database/generated/prisma/enums';

export class CreateQuizDto {
  @IsString()
  question!: string;

  @IsArray()
  @IsString({ each: true })
  choices!: string[];

  @IsString()
  answer!: string;

  @IsOptional()
  @IsEnum(TestQuestionType)
  type?: TestQuestionType;

  @IsOptional()
  @IsString()
  explanation?: string;
}
