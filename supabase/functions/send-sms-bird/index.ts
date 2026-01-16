import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type HookPayload = {
  user: { phone: string };
  sms: { otp: string };
};

function normalizeHookSecret(raw: string) {
  // Supabase Hook Secret kommt oft als "v1,whsec_<...>" -> wir extrahieren den base64-Teil
  return raw.replace(/^v\d+,whsec_/, "").replace(/^whsec_/, "").trim();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // 1) Supabase Hook Signatur verifizieren
  const rawSecret = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";
  const trimmedSecret = rawSecret.trim();
  const normalizedSecret = normalizeHookSecret(trimmedSecret);
  const hookSecrets = new Set([trimmedSecret, normalizedSecret].filter(Boolean));
  if (hookSecrets.size === 0) {
    return new Response(JSON.stringify({ error: { http_code: 500, message: "Missing SEND_SMS_HOOK_SECRET" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text(); // wichtig: text(), nicht json()
  const headers = Object.fromEntries(req.headers);

  let event: HookPayload | null = null;
  let verifyError: unknown = null;
  for (const secret of hookSecrets) {
    try {
      const wh = new Webhook(secret);
      event = wh.verify(payload, headers) as HookPayload;
      break;
    } catch (err) {
      verifyError = err;
    }
  }
  if (!event) {
    console.error("Invalid hook signature", verifyError);
    return new Response(JSON.stringify({ error: { http_code: 401, message: "Invalid hook signature" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const phone = event.user.phone;
  const otp = event.sms.otp;

  // 2) Bird Channels API call
  const birdKey = Deno.env.get("BIRD_ACCESS_KEY");
  const workspaceId = Deno.env.get("BIRD_WORKSPACE_ID");
  const channelId = Deno.env.get("BIRD_SMS_CHANNEL_ID");

  if (!birdKey || !workspaceId || !channelId) {
    return new Response(JSON.stringify({ error: { http_code: 500, message: "Missing Bird env vars" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const msg = `Dein Bestätigungscode ist: ${otp}`;

  const birdRes = await fetch(
    `https://api.bird.com/workspaces/${workspaceId}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `AccessKey ${birdKey}`,
      },
      body: JSON.stringify({
        receiver: { contacts: [{ identifierValue: phone }] },
        body: { type: "text", text: { text: msg } },
      }),
    }
  );

  if (!birdRes.ok) {
    const err = await birdRes.text();
    return new Response(JSON.stringify({ error: { http_code: 502, message: `Bird error: ${err}` } }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
});
