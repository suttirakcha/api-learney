import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

export class UpdateProfileDto {
  @Trim()
  @IsString()
  fullname: string;

  @Trim()
  @IsEmail()
  email: string;

  @Trim()
  @IsOptional()
  @IsString()
  phone?: string;

  @Trim()
  @IsOptional()
  @IsString()
  image?: string;
}
