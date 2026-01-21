import { Module } from "@nestjs/common";
import { VpnCheckController } from "./vpn-check.controller";
import { VpnCheckService } from "./vpn-check.service";

@Module({
  controllers: [VpnCheckController],
  providers: [VpnCheckService],
})
export class SecurityModule {}
