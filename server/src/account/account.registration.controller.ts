import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AccountService } from "./account.service";
import { RegisterEmailDto } from "./dto/register-email.dto";

@Controller("v1/account/register")
export class AccountRegistrationController {
  constructor(private readonly accountService: AccountService) {}

  @Post("email")
  @HttpCode(HttpStatus.CREATED)
  async registerEmail(@Body() body: RegisterEmailDto) {
    return this.accountService.registerEmailAccount(body);
  }
}
