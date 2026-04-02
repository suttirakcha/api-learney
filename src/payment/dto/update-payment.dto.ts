import { PaymentStatus } from '@/database/generated/prisma';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  evidence?: string;
}
