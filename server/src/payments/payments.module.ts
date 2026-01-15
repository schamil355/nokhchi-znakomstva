import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StripeController } from "./stripe/stripe.controller";
import { StripePaymentService } from "./stripe/stripe.service";

@Module({
  imports: [ConfigModule],
  controllers: [StripeController],
  providers: [StripePaymentService],
})
export class PaymentsModule {}
