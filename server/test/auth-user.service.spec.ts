import { createHmac } from "node:crypto";
import { AuthUserService } from "../src/common/services/auth-user.service";

const buildJwt = (payload: Record<string, any>, secret: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const headerPart = encode(header);
  const payloadPart = encode(payload);
  const data = `${headerPart}.${payloadPart}`;
  const signature = createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${signature}`;
};

describe("AuthUserService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("verifies JWT locally and caches it", async () => {
    process.env.SUPABASE_JWT_SECRET = "jwt-secret";
    const service = new AuthUserService();
    const token = buildJwt(
      { sub: "user-1", email: "a@example.com", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 60 },
      process.env.SUPABASE_JWT_SECRET
    );

    const first = await service.extractUser(token);
    const second = await service.extractUser(token);

    expect(first?.id).toBe("user-1");
    expect(second?.id).toBe("user-1");
    expect(second).toEqual(first);
  });
});
