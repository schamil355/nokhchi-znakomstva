import { Injectable, Logger } from "@nestjs/common";
import type { Request } from "express";

type VpnCheckResult = {
  blocked: boolean;
  provider: string;
  reason: string | null;
  ip: string | null;
};

type CacheEntry = {
  expiresAt: number;
  result: VpnCheckResult;
};

@Injectable()
export class VpnCheckService {
  private readonly logger = new Logger(VpnCheckService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = Math.max(0, parseInt(process.env.VPN_CHECK_CACHE_TTL_MS ?? "600000", 10));
  private readonly failOpen = (process.env.VPN_CHECK_FAIL_OPEN ?? "true").toLowerCase() !== "false";
  private readonly strict = (process.env.VPN_CHECK_STRICT ?? "true").toLowerCase() === "true";
  private readonly ipqsKey = (process.env.IPQS_API_KEY ?? "").trim();

  async check(request: Request): Promise<VpnCheckResult> {
    const ip = this.extractClientIp(request);
    if (!ip) {
      return { blocked: false, provider: "none", reason: "ip_missing", ip: null };
    }
    if (this.isPrivateIp(ip)) {
      return { blocked: false, provider: "none", reason: "private_ip", ip };
    }

    const cached = this.cache.get(ip);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const result = await this.lookup(ip);
    if (this.cacheTtlMs > 0) {
      this.cache.set(ip, { expiresAt: Date.now() + this.cacheTtlMs, result });
    }
    return result;
  }

  private extractClientIp(request: Request): string | null {
    const forwarded = request.headers["x-forwarded-for"];
    const candidates: string[] = [];

    if (typeof forwarded === "string") {
      candidates.push(...forwarded.split(",").map((value) => value.trim()).filter(Boolean));
    } else if (Array.isArray(forwarded)) {
      candidates.push(...forwarded.map((value) => value.trim()).filter(Boolean));
    }

    const headerKeys = ["cf-connecting-ip", "x-real-ip", "x-client-ip"];
    for (const key of headerKeys) {
      const headerValue = request.headers[key];
      if (typeof headerValue === "string" && headerValue.trim()) {
        candidates.push(headerValue.trim());
      }
    }

    if (request.ip) {
      candidates.push(request.ip);
    }
    if (request.socket?.remoteAddress) {
      candidates.push(request.socket.remoteAddress);
    }

    for (const candidate of candidates) {
      const normalized = this.normalizeIp(candidate);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  }

  private normalizeIp(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("::ffff:")) {
      return trimmed.slice(7);
    }
    return trimmed;
  }

  private isPrivateIp(ip: string): boolean {
    if (ip === "127.0.0.1" || ip === "::1") return true;
    if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
    if (ip.startsWith("172.")) {
      const part = Number(ip.split(".")[1]);
      if (part >= 16 && part <= 31) return true;
    }
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
    return false;
  }

  private async lookup(ip: string): Promise<VpnCheckResult> {
    if (this.ipqsKey) {
      return this.lookupIpQualityScore(ip);
    }
    return this.lookupIpApi(ip);
  }

  private async lookupIpQualityScore(ip: string): Promise<VpnCheckResult> {
    const url = `https://ipqualityscore.com/api/json/ip/${this.ipqsKey}/${encodeURIComponent(ip)}?strictness=1&fast=true&allow_public_access_points=true`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ipqs_http_${response.status}`);
      }
      const data = await response.json();
      if (data?.success === false) {
        throw new Error(data?.message ?? "ipqs_error");
      }

      const flags = [
        data?.vpn ? "vpn" : null,
        data?.proxy ? "proxy" : null,
        data?.tor ? "tor" : null,
        data?.active_vpn ? "active_vpn" : null,
        data?.active_tor ? "active_tor" : null
      ].filter(Boolean) as string[];
      const blocked = flags.length > 0;

      return {
        blocked,
        provider: "ipqualityscore",
        reason: blocked ? flags.join(",") : null,
        ip
      };
    } catch (error) {
      return this.handleFailure("ipqualityscore", ip, error);
    }
  }

  private async lookupIpApi(ip: string): Promise<VpnCheckResult> {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,proxy,hosting`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ipapi_http_${response.status}`);
      }
      const data = await response.json();
      if (data?.status !== "success") {
        throw new Error(data?.message ?? "ipapi_error");
      }

      const flags = [
        data?.proxy ? "proxy" : null,
        data?.hosting ? "hosting" : null
      ].filter(Boolean) as string[];
      const blocked = Boolean(data?.proxy || (this.strict && data?.hosting));

      return {
        blocked,
        provider: "ip-api",
        reason: blocked ? flags.join(",") : null,
        ip
      };
    } catch (error) {
      return this.handleFailure("ip-api", ip, error);
    }
  }

  private handleFailure(provider: string, ip: string, error: unknown): VpnCheckResult {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`VPN check failed (${provider}) for ${ip}: ${message}`);
    if (this.failOpen) {
      return { blocked: false, provider, reason: "check_failed", ip };
    }
    return { blocked: true, provider, reason: "check_failed", ip };
  }
}
