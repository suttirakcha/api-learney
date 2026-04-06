import {
  IsAlphanumeric,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Trim } from 'src/common/decorators/trim.decorator';

export class ResetPasswordDto {
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  @Trim()
  token: string;

  @MinLength(6, { message: 'Password must have at least 6 characters' })
  @IsAlphanumeric('en-US', {
    message: 'Password can contain only number and letter',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @Trim()
  password: string;
}
