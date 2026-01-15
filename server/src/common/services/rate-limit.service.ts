import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis: Redis | null;
  private readonly enabled: boolean;
  private redisReady = false;
  private lastError: string | null = null;
  private lastWarnAt = 0;

  constructor() {
    this.enabled = (process.env.ENABLE_REDIS ?? "").toLowerCase() === "true";
    if (!this.enabled) {
      this.logger.warn("Redis disabled via ENABLE_REDIS flag – rate limiting is inactive");
      this.redis = null;
      return;
    }
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1500,
    });
    this.redis.on("ready", () => {
      this.redisReady = true;
      this.logger.log("Redis connection ready");
    });
    this.redis.on("end", () => {
      this.redisReady = false;
      this.warnOnce("Redis connection closed");
    });
    this.redis.on("error", (error) => {
      this.redisReady = false;
      this.lastError = error?.message ?? String(error);
      this.warnOnce("Redis error", error);
    });
  }

  getStatus() {
    return {
      enabled: this.enabled,
      ready: this.redisReady,
      lastError: this.lastError,
    };
  }

  async isRateLimited(key: string, limit: number, ttlSeconds: number): Promise<boolean> {
    if (!this.redis || !this.redisReady) {
      return false;
    }
    try {
      const counter = await this.redis.multi().incr(key).expire(key, ttlSeconds, "NX").exec();
      const value = counter?.[0]?.[1] as number;
      return value > limit;
    } catch (error) {
      this.handleRedisFailure(error);
      return false;
    }
  }

  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.redis || !this.redisReady) {
      return;
    }
    try {
      await this.redis.set(key, value, "EX", ttlSeconds);
    } catch (error) {
      this.handleRedisFailure(error);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.redis || !this.redisReady) {
      return null;
    }
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.handleRedisFailure(error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis || !this.redisReady) {
      return;
    }
    try {
      await this.redis.del(key);
    } catch (error) {
      this.handleRedisFailure(error);
    }
  }

  private handleRedisFailure(error: unknown) {
    this.redisReady = false;
    this.lastError = (error as { message?: string })?.message ?? String(error);
    this.warnOnce("Redis operation failed", error);
  }

  private warnOnce(message: string, error?: unknown) {
    const now = Date.now();
    if (now - this.lastWarnAt < 30_000) {
      return;
    }
    this.lastWarnAt = now;
    if (error) {
      this.logger.warn(message, error);
      return;
    }
    this.logger.warn(message);
  }
}
