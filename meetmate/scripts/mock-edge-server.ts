import http from "http";
import { parse } from "url";

const PORT = Number(process.env.MOCK_EDGE_PORT ?? 54321);

const state: Record<string, { entitlements: any[]; events: any[] }> = {};

const ensureUserState = (userId: string) => {
  if (!state[userId]) {
    state[userId] = { entitlements: [], events: [] };
  }
  return state[userId];
};

const jsonResponse = (res: http.ServerResponse, status: number, body: unknown) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*"
  });
  res.end(payload);
};

const server = http.createServer((req, res) => {
  if (!req.url) {
    jsonResponse(res, 400, { error: "invalid_request" });
    return;
  }

  const { pathname } = parse(req.url, true);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    res.end();
    return;
  }

  if (pathname === "/functions/v1/psp/webhook/dev-simulate" && req.method === "POST") {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8") || "{}";
        const payload = JSON.parse(raw);
        const userId: string = payload.user_id ?? payload.userExternalId;
        if (!userId) {
          jsonResponse(res, 400, { error: "missing_user_id" });
          return;
        }

        const store = ensureUserState(userId);
        const entitlement = {
          id: payload.tx_id ?? payload.txId ?? `mock-${Date.now()}`,
          user_id: userId,
          product_id: payload.product_id ?? "debug_pro_monthly",
          source: "web_psp",
          status: payload.status ?? "active",
          period_start: payload.period_start ?? new Date().toISOString(),
          period_end:
            payload.period_end ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: payload
        };

        store.entitlements = [entitlement];
        store.events.unshift({
          id: `evt-${Date.now()}`,
          event_type: entitlement.status,
          created_at: new Date().toISOString(),
          payload,
          entitlement: {
            product_id: entitlement.product_id,
            source: entitlement.source,
            user_id: entitlement.user_id
          }
        });
        store.events = store.events.slice(0, 20);

        jsonResponse(res, 200, { status: "ok", mode: "dev" });
      } catch (error) {
        console.error("mock-edge error", error);
        jsonResponse(res, 500, { error: "internal_error" });
      }
    });
    return;
  }

  if (pathname === "/rest/v1/rpc/get_user_entitlements" && req.method === "POST") {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8") || "{}";
      const payload = JSON.parse(raw);
      const userId: string = payload.uid;
      if (!userId) {
        jsonResponse(res, 400, { error: "missing_uid" });
        return;
      }
      const store = ensureUserState(userId);
      jsonResponse(res, 200, store.entitlements.map((ent) => ({
        product_id: ent.product_id,
        source: ent.source,
        period_end: ent.period_end
      })));
    });
    return;
  }

  if (pathname === "/rest/v1/active_entitlements_v" && req.method === "GET") {
    const { query } = parse(req.url, true);
    const filter = (query?.["user_id"] as string) ?? "";
    const userId = filter.replace("eq.", "");
    const store = ensureUserState(userId);
    jsonResponse(res, 200, store.entitlements);
    return;
  }

  if (pathname === "/rest/v1/entitlement_events" && req.method === "GET") {
    const { query } = parse(req.url, true);
    const filter = (query?.["entitlement.user_id"] as string) ?? "";
    const userId = filter.replace("eq.", "");
    const store = ensureUserState(userId);
    jsonResponse(res, 200, store.events);
    return;
  }

  if (pathname === "/functions/v1/geo" && req.method === "POST") {
    jsonResponse(res, 200, { countryCode: "DE", source: "mock" });
    return;
  }

  jsonResponse(res, 404, { error: "not_found" });
});

server.listen(PORT, () => {
  console.log(`[mock-edge] listening on http://localhost:${PORT}`);
});
