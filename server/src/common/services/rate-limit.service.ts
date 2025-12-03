import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis: Redis | null;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = (process.env.ENABLE_REDIS ?? "").toLowerCase() === "true";
    if (!this.enabled) {
      this.logger.warn("Redis disabled via ENABLE_REDIS flag – rate limiting is inactive");
      this.redis = null;
      return;
    }
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 2,
    });
  }

  async isRateLimited(key: string, limit: number, ttlSeconds: number): Promise<boolean> {
    if (!this.redis) {
      return false;
    }
    const counter = await this.redis.multi().incr(key).expire(key, ttlSeconds, "NX").exec();
    const value = counter?.[0]?.[1] as number;
    if (value > limit) {
      return true;
    }
    return false;
  }

  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.redis) {
      return;
    }
    await this.redis.set(key, value, "EX", ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    if (!this.redis) {
      return null;
    }
    return this.redis.get(key);
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) {
      return;
    }
    await this.redis.del(key);
  }
}
