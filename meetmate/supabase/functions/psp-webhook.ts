// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { crypto } from "https://deno.land/std@0.192.0/crypto/mod.ts";

export type NormalizedEvent = {
  userExternalId: string;
  productId: string;
  status: "active" | "expired" | "canceled" | "refunded";
  periodStart: string | null;
  periodEnd: string | null;
  txId: string;
  raw: Record<string, unknown>;
};

type ProviderContext = {
  request: Request;
  payload: string;
};

type ProviderAdapter = {
  verifySignature(ctx: ProviderContext): Promise<boolean>;
  parseEvent(ctx: ProviderContext): Promise<NormalizedEvent>;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase environment variables missing");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const ENVIRONMENT = Deno.env.get("ENVIRONMENT") ?? (SUPABASE_URL.includes("localhost") ? "dev" : "production");

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const YOOKASSA_SECRET = Deno.env.get("YOOKASSA_WEBHOOK_SECRET") ?? "";

const textEncoder = new TextEncoder();

const stripeAdapter: ProviderAdapter = {
  async verifySignature({ request, payload }) {
    const signature = request.headers.get("stripe-signature") ?? "";
    if (!STRIPE_WEBHOOK_SECRET) return false;
    const timestamp = signature.split(",").find((part) => part.startsWith("t="))?.split("=")[1];
    const signedPayload = `${timestamp}.${payload}`;
    const hmac = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(STRIPE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const digest = await crypto.subtle.sign("HMAC", hmac, textEncoder.encode(signedPayload));
    const expected = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return signature.includes(`v1=${expected}`);
  },
  async parseEvent({ payload }) {
    const json = JSON.parse(payload);
    const data = json.data?.object ?? {};
    return {
      userExternalId: data.metadata?.user_id ?? data.client_reference_id ?? "",
      productId: data.items?.data?.[0]?.price?.product ?? data.plan?.product ?? "",
      status: stripeStatusToEntitlement(data.status),
      periodStart: data.current_period_start ? new Date(data.current_period_start * 1000).toISOString() : null,
      periodEnd: data.current_period_end ? new Date(data.current_period_end * 1000).toISOString() : null,
      txId: data.id ?? json.id ?? crypto.randomUUID(),
      raw: json
    };
  }
};

const stripeStatusToEntitlement = (status: string): NormalizedEvent["status"] => {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "incomplete_expired":
    case "expired":
      return "expired";
    case "refunded":
      return "refunded";
    default:
      return "expired";
  }
};

const yookassaAdapter: ProviderAdapter = {
  async verifySignature({ request, payload }) {
    if (!YOOKASSA_SECRET) return false;
    const bodyHash = request.headers.get("content-digest") ?? "";
    const computed = await crypto.subtle.digest("SHA-256", textEncoder.encode(payload));
    const digest = `sha-256=${btoa(String.fromCharCode(...new Uint8Array(computed)))}`;
    return bodyHash === digest;
  },
  async parseEvent({ payload }) {
    const json = JSON.parse(payload);
    const object = json.object ?? {};
    return {
      userExternalId: object.metadata?.user_id ?? object.customer_id ?? "",
      productId: object.metadata?.product_id ?? object.code ?? "",
      status: yooStatusToEntitlement(object.status),
      periodStart: object.start_date ?? null,
      periodEnd: object.end_date ?? null,
      txId: object.id ?? json.id ?? crypto.randomUUID(),
      raw: json
    };
  }
};

const yooStatusToEntitlement = (status: string): NormalizedEvent["status"] => {
  switch (status) {
    case "succeeded":
    case "active":
      return "active";
    case "canceled":
      return "canceled";
    case "refunded":
      return "refunded";
    default:
      return "expired";
  }
};

const adapters: Record<string, ProviderAdapter> = {
  stripe: stripeAdapter,
  yookassa: yookassaAdapter
};

const upsertEntitlement = async (event: NormalizedEvent) => {
  const { data: entitlement, error } = await supabase
    .from("entitlements")
    .upsert(
      {
        user_id: event.userExternalId,
        source: "web_psp",
        product_id: event.productId,
        status: event.status,
        period_start: event.periodStart,
        period_end: event.periodEnd,
        original_tx_id: event.txId,
        last_event_at: new Date().toISOString(),
        metadata: event.raw
      },
      { onConflict: "original_tx_id" }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  const entitlementId = entitlement?.id;
  if (!entitlementId) {
    const existing = await supabase.from("entitlements").select("id").eq("original_tx_id", event.txId).maybeSingle();
    return existing.data?.id ?? null;
  }
  return entitlementId;
};

const insertEvent = async (entitlementId: string, event: NormalizedEvent) => {
  const { error } = await supabase.from("entitlement_events").insert({
    entitlement_id: entitlementId,
    event_type: event.status,
    payload: event.raw
  });
  if (error) {
    console.error("Failed to insert entitlement event", error);
  }
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
    }
    const url = new URL(req.url);
    const provider = url.pathname.split("/").pop() ?? "";
    const payload = await req.text();

    if (provider === "dev-simulate") {
      if (ENVIRONMENT !== "dev") {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
      }
      const body = payload ? JSON.parse(payload) : {};
      const statusInput = typeof body.status === "string" ? (body.status as string) : "active";
      const normalizedStatus: NormalizedEvent["status"] =
        statusInput === "active" ||
        statusInput === "expired" ||
        statusInput === "canceled" ||
        statusInput === "refunded"
          ? (statusInput as NormalizedEvent["status"])
          : "active";
      const event: NormalizedEvent = {
        userExternalId: body.user_id ?? body.userExternalId ?? "",
        productId: body.product_id ?? body.productId ?? "debug_product",
        status: normalizedStatus,
        periodStart: body.period_start ?? body.periodStart ?? new Date().toISOString(),
        periodEnd:
          body.period_end ??
          body.periodEnd ??
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        txId: body.tx_id ?? body.txId ?? crypto.randomUUID(),
        raw: body
      };

      if (!event.userExternalId) {
        return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400 });
      }

      const entitlementId = await upsertEntitlement(event);
      if (entitlementId) {
        await insertEvent(entitlementId, event);
      }
      return new Response(JSON.stringify({ status: "ok", mode: "dev" }), { status: 200 });
    }

    const adapter = adapters[provider];
    if (!adapter) {
      return new Response(JSON.stringify({ error: "unknown_provider" }), { status: 404 });
    }
    const ctx: ProviderContext = { request: req, payload };
    const signatureValid = await adapter.verifySignature(ctx);
    if (!signatureValid) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401 });
    }
    const event = await adapter.parseEvent(ctx);
    if (!event.userExternalId) {
      return new Response(JSON.stringify({ error: "missing_user_id" }), { status: 400 });
    }
    const entitlementId = await upsertEntitlement(event);
    if (entitlementId) {
      await insertEvent(entitlementId, event);
    }
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  } catch (error) {
    console.error("Webhook error", error);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
  }
});
