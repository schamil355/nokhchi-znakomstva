import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { ok: true, status: "up", timestamp: new Date().toISOString() };
  }
}
