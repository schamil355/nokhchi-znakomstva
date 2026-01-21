import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { VpnCheckService } from "./vpn-check.service";

@Controller("v1/security")
export class VpnCheckController {
  constructor(private readonly vpnCheckService: VpnCheckService) {}

  @Get("vpn-check")
  async check(@Req() request: Request) {
    return this.vpnCheckService.check(request);
  }
}
