import { Injectable, Logger } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseAdminClient } from "../supabase-admin";

type CachedUser = {
  user: RequestUser;
  expiresAt: number;
};

export type RequestUser = {
  id: string;
  email?: string | null;
  role: string;
  exp?: number;
};

const FALLBACK_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AuthUserService {
  private readonly logger = new Logger(AuthUserService.name);
  private readonly jwtSecret = process.env.SUPABASE_JWT_SECRET;
  private readonly supabase: SupabaseClient | null = this.initSupabase();
  private readonly cache = new Map<string, CachedUser>();

  async extractUser(token: string): Promise<RequestUser | null> {
    const cached = this.cache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    const decoded = await this.verifyLocally(token).catch((error) => {
      this.logger.debug(`Local JWT verify failed: ${(error as Error).message}`);
      return null;
    });

    const user = decoded ?? (await this.lookupFromSupabase(token));
    if (!user) {
      return null;
    }

    const exp = user.exp ? user.exp * 1000 : Date.now() + FALLBACK_TTL_MS;
    this.cache.set(token, { user, expiresAt: exp - 2000 }); // small safety skew
    return user;
  }

  private async verifyLocally(token: string): Promise<RequestUser | null> {
    if (!this.jwtSecret) {
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    const signature = this.toBase64(signatureB64);
    const expected = createHmac("sha256", this.jwtSecret).update(data).digest("base64");

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new Error("Invalid signature");
    }

    const payloadJson = Buffer.from(this.toBase64(payloadB64), "base64").toString("utf8");
    const payload = JSON.parse(payloadJson) as any;
    const exp = typeof payload.exp === "number" ? payload.exp : undefined;

    const id = payload.sub;
    if (!id) {
      throw new Error("Missing sub claim");
    }

    return {
      id,
      email: payload.email ?? payload.user_email ?? null,
      role: payload.role ?? payload.app_metadata?.role ?? payload.user_metadata?.role ?? "user",
      exp,
    };
  }

  private async lookupFromSupabase(token: string): Promise<RequestUser | null> {
    if (!this.supabase) {
      return null;
    }
    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      if (error || !data?.user) {
        if (error) {
          this.logger.debug(`Supabase getUser failed: ${error.message}`);
        }
        return null;
      }
      return {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role ?? data.user.user_metadata?.role ?? "user",
        exp: undefined, // Supabase client does not expose exp; cache fallback TTL used.
      };
    } catch (error) {
      this.logger.debug(`Supabase lookup error: ${(error as Error).message}`);
      return null;
    }
  }

  private initSupabase(): SupabaseClient | null {
    try {
      return getSupabaseAdminClient();
    } catch (error) {
      this.logger.warn("Supabase admin client unavailable for auth fallback");
      return null;
    }
  }

  private toBase64(base64Url: string) {
    const normalized = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    if (padding === 2) {
      return `${normalized}==`;
    }
    if (padding === 3) {
      return `${normalized}=`;
    }
    if (padding === 1) {
      return `${normalized}===`;
    }
    return normalized;
  }
}
