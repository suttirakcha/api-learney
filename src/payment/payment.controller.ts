import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { JwtPayload } from 'src/types/jwt-payload.type';

@Controller('payments')
@UseGuards(AuthGuard, RoleGuard)
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Post('mock/session')
  createMockSession(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.service.createMockSession(user.sub);
  }

  @Get('mock/:paymentId')
  getMockPayment(@Param('paymentId') paymentId: string, @Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.service.getMockPayment(user.sub, paymentId);
  }

  @Post('mock/:paymentId/confirm')
  confirmMockPayment(
    @Param('paymentId') paymentId: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtPayload;
    return this.service.confirmMockPayment(user.sub, paymentId);
  }
}
