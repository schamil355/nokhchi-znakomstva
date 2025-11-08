import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { VerificationService } from "../verification.service";

@Injectable()
export class VerificationCleanupJob {
  private readonly logger = new Logger(VerificationCleanupJob.name);

  constructor(private readonly verificationService: VerificationService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCleanup(): Promise<void> {
    this.logger.log("Running verification cleanup job");
    await this.verificationService.expireSessions();
    await this.verificationService.purgeTemporaryArtifacts();
  }
}
