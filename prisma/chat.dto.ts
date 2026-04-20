import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class StartChatSessionDto {
  @IsOptional()
  @IsString()
  guestToken?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;

  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(1000, { message: 'ข้อความยาวเกินไป (สูงสุด 1000 ตัวอักษร)' })
  message: string;

  @IsOptional()
  @IsString()
  guestToken?: string;
}
