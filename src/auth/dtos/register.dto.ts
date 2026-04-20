import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Validate,
} from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';
import { Match } from '../../common/validators/match.validator';

export class RegisterDto {
  @IsOptional()
  @IsIn(['USER', 'INSTRUCTOR'])
  role: 'USER' | 'INSTRUCTOR';
  @Trim()
  @IsString({ message: 'username must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  fullname: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
  @Trim()
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must have at least 6 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
  @Trim()
  @IsString({ message: 'confirmPassword must be a string' })
  @MinLength(6, { message: 'confirmPassword must have at least 6 characters' })
  @IsNotEmpty({ message: 'confirmPassword is required' })
  @Validate(Match, ['password'])
  confirmPassword: string;
}
