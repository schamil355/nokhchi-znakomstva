import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "../../common/supabase-admin";

type PlanId = "monthly" | "yearly";
type Currency = "EUR" | "NOK";
type StripeSubscription = Stripe.Subscription & { current_period_end?: number | null };
type PlanSummary = { id: PlanId; amountMinor: number; currency: Currency };

type CheckoutParams = {
  userId: string;
  email?: string | null;
  planId: PlanId;
  currency: Currency;
  successUrl: string;
  cancelUrl: string;
};

@Injectable()
export class StripePaymentService {
  private readonly logger = new Logger(StripePaymentService.name);
  private readonly supabase = getSupabaseAdminClient();
  private readonly stripe: Stripe | null;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>("STRIPE_SECRET_KEY");
    this.stripe = secret ? new Stripe(secret) : null;
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new Error("STRIPE_NOT_CONFIGURED");
    }
    return this.stripe;
  }

  private getPriceId(currency: Currency, planId: PlanId): string | null {
    const planKey = planId === "monthly" ? "MONTHLY" : "YEARLY";
    const envKey = `STRIPE_PRICE_ID_${currency}_${planKey}`;
    return this.config.get<string>(envKey) ?? null;
  }

  async createCheckoutSession(params: CheckoutParams): Promise<{ url: string }> {
    const stripe = this.getStripe();
    const priceId = this.getPriceId(params.currency, params.planId);
    if (!priceId) {
      throw new Error("PRICE_NOT_CONFIGURED");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      allow_promotion_codes: true,
      customer_email: params.email ?? undefined,
      client_reference_id: params.userId,
      metadata: {
        user_id: params.userId,
        plan_id: params.planId,
        currency: params.currency,
        source: "pwa",
      },
      subscription_data: {
        metadata: {
          user_id: params.userId,
          plan_id: params.planId,
          currency: params.currency,
          source: "pwa",
        },
      },
    });

    if (!session.url) {
      throw new Error("CHECKOUT_URL_MISSING");
    }

    return { url: session.url };
  }

  async getAvailablePlans(currency: Currency): Promise<{ currency: Currency; plans: PlanSummary[] }> {
    if (!this.stripe) {
      return { currency, plans: [] };
    }
    const stripe = this.getStripe();
    const plans: PlanSummary[] = [];
    const planIds: PlanId[] = ["monthly", "yearly"];

    for (const planId of planIds) {
      const priceId = this.getPriceId(currency, planId);
      if (!priceId) {
        continue;
      }
      try {
        const price = await stripe.prices.retrieve(priceId);
        const amountMinor = price.unit_amount;
        if (typeof amountMinor !== "number") {
          this.logger.warn(`Stripe price ${priceId} missing unit_amount.`);
          continue;
        }
        plans.push({ id: planId, amountMinor, currency });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Stripe error";
        this.logger.warn(`Failed to load Stripe price ${priceId}: ${message}`);
      }
    }

    return { currency, plans };
  }

  async handleWebhook(rawBody: Buffer, signature: string | string[] | undefined): Promise<void> {
    const stripe = this.getStripe();
    const webhookSecret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET_MISSING");
    }
    if (!signature) {
      throw new Error("STRIPE_SIGNATURE_MISSING");
    }

    const signatureValue = Array.isArray(signature) ? signature[0] : signature;
    const event = stripe.webhooks.constructEvent(rawBody, signatureValue, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") return;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!subscriptionId) return;
        await this.syncSubscription(subscriptionId);
        return;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as StripeSubscription;
        await this.syncSubscriptionObject(subscription);
        return;
      }
      default:
        return;
    }
  }

  private async syncSubscription(subscriptionId: string): Promise<void> {
    const stripe = this.getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await this.syncSubscriptionObject(subscription);
  }

  private async syncSubscriptionObject(subscription: StripeSubscription): Promise<void> {
    const userId = subscription.metadata?.user_id ?? null;
    if (!userId) {
      this.logger.warn(`Stripe subscription ${subscription.id} missing user_id metadata.`);
      return;
    }

    const status = subscription.status ?? "unknown";
    const isPremium = status === "active" || status === "trialing";
    const periodEnd = subscription.current_period_end ?? null;
    const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
    const updatedAt = new Date().toISOString();

    const { error: profileError } = await this.supabase
      .from("profiles")
      .update({ is_premium: isPremium, updated_at: updatedAt })
      .eq("id", userId);
    if (profileError) {
      this.logger.error(`Failed to update profile premium: ${profileError.message}`);
    }

    try {
      const { error: subError } = await this.supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            status,
            entitlement: "premium",
            provider: "stripe",
            expires_at: expiresAt,
            updated_at: updatedAt,
          },
          { onConflict: "user_id" }
        );
      if (subError) {
        this.logger.warn(`Failed to upsert subscription: ${subError.message}`);
      }
    } catch (error) {
      this.logger.warn(`Subscriptions table update skipped: ${(error as Error).message}`);
    }
  }
}
