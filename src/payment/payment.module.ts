import { Global, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from 'src/auth/auth.module';

@Global()
@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
