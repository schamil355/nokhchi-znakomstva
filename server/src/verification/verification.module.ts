import { Module } from "@nestjs/common";
import { VerificationController } from "./verification.controller";
import { VerificationService } from "./verification.service";
import { VerificationCleanupJob } from "./jobs/verification-cleanup.job";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [CommonModule],
  controllers: [VerificationController],
  providers: [VerificationService, VerificationCleanupJob],
  exports: [VerificationService],
})
export class VerificationModule {}
