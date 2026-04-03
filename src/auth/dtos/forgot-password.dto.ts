import { IsEmail, IsNotEmpty } from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Trim()
  email!: string;
}
