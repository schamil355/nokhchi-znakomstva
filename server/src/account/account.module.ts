import { Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { AccountRegistrationController } from "./account.registration.controller";

@Module({
  controllers: [AccountController, AccountRegistrationController],
  providers: [AccountService],
})
export class AccountModule {}
