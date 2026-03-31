import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryCourseDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateCourseDto {
  @IsString()
  courseName: string;

  @IsString()
  description: string;

  @IsString()
  category: string;

  @IsNumber()
  price: number;

  @IsArray()
  tags: string[];

  @IsOptional()
  @IsString()
  thumbnail?: string;
}
