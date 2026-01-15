import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { WebPushService, WebPushSubscription } from "./web-push.service";

@ApiTags("web-push")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("v1/web-push")
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Post("subscribe")
  async subscribe(@Req() req: Request & { user?: { id: string } }, @Body() body: any) {
    const subscription = body?.subscription as WebPushSubscription | undefined;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new BadRequestException("INVALID_SUBSCRIPTION");
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("AUTH_REQUIRED");
    }
    await this.webPushService.upsertSubscription(userId, subscription, body?.userAgent ?? null);
    return { ok: true };
  }

  @Post("unsubscribe")
  async unsubscribe(@Req() req: Request & { user?: { id: string } }, @Body() body: any) {
    const endpoint = body?.endpoint;
    if (!endpoint) {
      throw new BadRequestException("ENDPOINT_REQUIRED");
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("AUTH_REQUIRED");
    }
    await this.webPushService.removeSubscription(userId, endpoint);
    return { ok: true };
  }

  @Post("test")
  async test(@Req() req: Request & { user?: { id: string } }, @Body() body: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("AUTH_REQUIRED");
    }
    const title = body?.title ?? "Test notification";
    const payload = {
      title,
      body: body?.body ?? "Web push is enabled.",
      data: body?.data ?? { type: "test" }
    };
    const result = await this.webPushService.sendToUser(userId, payload);
    return { ok: true, sent: result.sent };
  }
}
