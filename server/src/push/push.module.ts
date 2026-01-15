import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PushService } from "./push.service";
import { PushProcessor } from "./push.processor";
import { WebPushService } from "./web-push.service";
import { WebPushController } from "./web-push.controller";

@Module({
  imports: [ConfigModule],
  providers: [PushService, PushProcessor, WebPushService],
  controllers: [WebPushController],
})
export class PushModule {}
