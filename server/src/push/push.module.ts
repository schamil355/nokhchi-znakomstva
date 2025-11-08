import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PushService } from "./push.service";
import { PushProcessor } from "./push.processor";

@Module({
  imports: [ConfigModule],
  providers: [PushService, PushProcessor],
})
export class PushModule {}
