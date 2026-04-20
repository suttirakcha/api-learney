import {
  IsString,
  IsInt,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class AnalyzeRecommendationDto {
  @IsOptional()
  @IsInt({ message: 'อายุต้องเป็นตัวเลข' })
  @Min(10, { message: 'อายุต้องมากกว่า 10 ปี' })
  @Max(100)
  age?: number;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  currentCareer?: string;

  @IsOptional()
  @IsString()
  targetCareer?: string;

  @IsArray({ message: 'ความสนใจต้องเป็น Array' })
  @IsString({ each: true })
  interests: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentSkills?: string[];

  @IsArray({ message: 'ทักษะที่อยากพัฒนาต้องเป็น Array' })
  @IsString({ each: true })
  desiredSkills: string[];

  @IsOptional()
  @IsString()
  learningStyle?: string;

  @IsOptional()
  @IsInt()
  budget?: number;

  @IsOptional()
  @IsInt()
  studyHoursPerWeek?: number;

  @IsOptional()
  @IsString()
  experienceLevel?: string; // Beginner, Intermediate, Advanced
}
