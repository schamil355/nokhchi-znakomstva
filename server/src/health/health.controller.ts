import { Controller, Get } from "@nestjs/common";
import { RateLimitService } from "../common/services/rate-limit.service";

@Controller("health")
export class HealthController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get()
  check() {
    const redis = this.rateLimitService.getStatus();
    return {
      ok: true,
      status: "up",
      timestamp: new Date().toISOString(),
      redis: {
        enabled: redis.enabled,
        ready: redis.ready,
        lastError: redis.lastError,
      },
    };
  }
}
