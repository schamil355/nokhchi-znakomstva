import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 2,
    });
  }

  async isRateLimited(key: string, limit: number, ttlSeconds: number): Promise<boolean> {
    const counter = await this.redis.multi().incr(key).expire(key, ttlSeconds, "NX").exec();
    const value = counter?.[0]?.[1] as number;
    if (value > limit) {
      return true;
    }
    return false;
  }

  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, "EX", ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
