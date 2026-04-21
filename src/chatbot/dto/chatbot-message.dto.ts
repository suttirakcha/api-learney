import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatbotMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกข้อความ' })
  @MaxLength(500, { message: 'ข้อความยาวเกิน 500 ตัวอักษร' })
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
