import { Global, Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from 'src/auth/auth.module';

@Global()
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
