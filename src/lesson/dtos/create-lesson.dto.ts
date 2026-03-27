import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  video: string;

  @IsString()
  @IsNotEmpty()
  exercise: string;

  @IsString()
  @IsNotEmpty()
  docs: string;
}
