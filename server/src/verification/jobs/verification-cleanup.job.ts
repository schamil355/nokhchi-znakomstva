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
    try {
      await this.verificationService.expireSessions();
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.logger.error(
          "Verification cleanup aborted – Datenbank-Login fehlgeschlagen. Bitte DATABASE_URL prüfen."
        );
        return;
      }
      throw error;
    }

    try {
      await this.verificationService.purgeTemporaryArtifacts();
    } catch (error) {
      if (this.isDatabaseAuthError(error)) {
        this.logger.error(
          "Verification cleanup (artifacts) abgebrochen – Datenbank-Login fehlgeschlagen. Bitte DATABASE_URL prüfen."
        );
        return;
      }
      throw error;
    }
  }

  private isDatabaseAuthError(error: unknown) {
    if (!error || typeof error !== "object") {
      return false;
    }
    const code = (error as { code?: string }).code;
    const message = (error as Error).message ?? "";
    return code === "P1000" || message.includes("Authentication failed");
  }
}
