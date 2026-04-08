import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

export class ChangePasswordDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @Trim()
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword: string;
}
