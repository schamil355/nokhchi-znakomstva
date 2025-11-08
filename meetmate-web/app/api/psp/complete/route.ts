import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PSP_WEBHOOK_PATH = process.env.SUPABASE_PSP_WEBHOOK_PATH ?? "/functions/v1/psp/webhook";

type CompletePayload = {
  productId: string;
  currency: string;
  amountMinor: number;
  source?: string;
};

export const POST = async (request: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json(
      { message: "Supabase environment variables missing" },
      { status: 500 }
    );
  }

  let payload: CompletePayload;
  try {
    payload = (await request.json()) as CompletePayload;
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.productId || !payload.currency || !payload.amountMinor) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}${PSP_WEBHOOK_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        provider: payload.currency === "RUB" ? "yookassa" : "stripe",
        productId: payload.productId,
        currency: payload.currency,
        amountMinor: payload.amountMinor,
        source: payload.source ?? "web_checkout"
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Supabase returned ${response.status}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Completion failed";
    console.error("Checkout complete error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
};
