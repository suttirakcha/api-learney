import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  courseName!: string;
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsString()
  description!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  videoPreview?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  targetAudience?: string[];

  @IsOptional()
  @IsArray()
  requirements?: string[];

  @IsOptional()
  @IsArray()
  willLearnMessages?: string[];

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  themeKey?: string;
}
