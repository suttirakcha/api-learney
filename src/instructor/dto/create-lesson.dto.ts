import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsInt()
  order!: number;
}
