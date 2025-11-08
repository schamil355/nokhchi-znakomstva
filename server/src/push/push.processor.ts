import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PushService } from "./push.service";

@Injectable()
export class PushProcessor {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly pushService: PushService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleQueue() {
    try {
      await this.pushService.processQueue();
    } catch (error) {
      this.logger.error("Failed to process push queue", error as Error);
    }
  }
}
