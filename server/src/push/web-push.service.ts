import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";
import { getSupabaseAdminClient } from "../common/supabase-admin";

export type WebPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly supabase = getSupabaseAdminClient();
  private readonly vapidPublicKey: string;
  private readonly vapidPrivateKey: string;
  private readonly vapidSubject: string;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.vapidPublicKey = this.configService.get<string>("push.webPushPublicKey") ?? "";
    this.vapidPrivateKey = this.configService.get<string>("push.webPushPrivateKey") ?? "";
    this.vapidSubject = this.configService.get<string>("push.webPushSubject") ?? "";

    this.configured = Boolean(this.vapidPublicKey && this.vapidPrivateKey && this.vapidSubject);
    if (this.configured) {
      webpush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);
    } else {
      this.logger.warn("Web push VAPID keys missing; web push disabled.");
    }
  }

  async upsertSubscription(userId: string, subscription: WebPushSubscription, userAgent?: string | null) {
    if (!this.configured) {
      throw new Error("WEB_PUSH_NOT_CONFIGURED");
    }
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new Error("INVALID_SUBSCRIPTION");
    }

    const { error } = await this.supabase.from("web_push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async removeSubscription(userId: string, endpoint: string) {
    if (!this.configured) {
      throw new Error("WEB_PUSH_NOT_CONFIGURED");
    }
    const { error } = await this.supabase
      .from("web_push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) {
      throw new Error(error.message);
    }
  }

  async sendToUser(userId: string, payload: Record<string, any>) {
    if (!this.configured) {
      throw new Error("WEB_PUSH_NOT_CONFIGURED");
    }
    const { data, error } = await this.supabase
      .from("web_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    const subscriptions = (data ?? []) as SubscriptionRow[];
    if (!subscriptions.length) {
      return { sent: 0 };
    }

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (err: any) {
        const statusCode = err?.statusCode ?? null;
        if (statusCode === 404 || statusCode === 410) {
          await this.supabase.from("web_push_subscriptions").delete().eq("id", sub.id);
          this.logger.warn(`Removed stale web push subscription ${sub.id}`);
        } else {
          this.logger.warn(`Web push send failed for ${sub.id}`, err);
        }
      }
    }

    return { sent };
  }
}
