import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { StripePaymentService } from "./stripe.service";

type CheckoutBody = {
  planId?: "monthly" | "yearly";
  currency?: "EUR" | "NOK";
};

@Controller("v1/payments/stripe")
export class StripeController {
  constructor(private readonly stripePayments: StripePaymentService) {}

  @Post("checkout")
  async createCheckoutSession(@Req() req: Request & { user?: any }, @Body() body: CheckoutBody) {
    const userId = req.user?.id ?? null;
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }

    const planId = body?.planId ?? null;
    if (planId !== "monthly" && planId !== "yearly") {
      throw new BadRequestException("INVALID_PLAN");
    }

    const currency = body?.currency === "NOK" ? "NOK" : "EUR";
    const baseUrl = (process.env.WEB_BASE_URL ?? "").replace(/\/$/, "");
    if (!baseUrl) {
      throw new BadRequestException("WEB_BASE_URL_MISSING");
    }

    const successUrl = `${baseUrl}/?checkout=success`;
    const cancelUrl = `${baseUrl}/?checkout=cancel`;

    const { url } = await this.stripePayments.createCheckoutSession({
      userId,
      email: req.user?.email ?? null,
      planId,
      currency,
      successUrl,
      cancelUrl,
    });

    return { url };
  }

  @Get("plans")
  async getPlans(@Query("currency") currency?: string) {
    const normalized = typeof currency === "string" ? currency.toUpperCase() : "EUR";
    const resolved = normalized === "NOK" ? "NOK" : "EUR";
    return this.stripePayments.getAvailablePlans(resolved);
  }

  @Post("webhook")
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature?: string | string[]
  ) {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody || !(rawBody instanceof Buffer)) {
      throw new BadRequestException("RAW_BODY_REQUIRED");
    }
    await this.stripePayments.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
