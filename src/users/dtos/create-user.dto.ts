import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Username is a required field' })
  fullname: string;

  @IsString()
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is a required field' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is a required field' })
  password: string;
}
