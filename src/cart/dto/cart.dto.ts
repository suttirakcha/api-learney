import { IsString } from 'class-validator';

export class CartDto {
  @IsString()
  courseId: string;
}
