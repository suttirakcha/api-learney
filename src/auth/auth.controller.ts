import { Body, Controller, Post } from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto); // ✅ ต้อง return
  }
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto); // ✅ ต้อง return
  }
}
