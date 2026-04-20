import { IsString } from 'class-validator';

export class PromotionCodeDto {
  @IsString()
  code: string;
}

