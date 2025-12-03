import { Controller, Delete, Get, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AccountService } from "./account.service";

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags("account")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("v1/account")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get("export")
  async exportAccount(@Req() req: AuthedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return this.accountService.exportAccount(userId);
  }

  @Delete()
  async deleteAccount(@Req() req: AuthedRequest, @Query("dryRun") dryRun?: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    const isDryRun = (dryRun ?? "").toLowerCase() === "true";
    return this.accountService.deleteAccount(userId, { dryRun: isDryRun });
  }
}
