import { PaymentStatus } from '@/database/generated/prisma/enums';
import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  evidence?: string;
}
