import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PushService } from "./push.service";

@Injectable()
export class PushProcessor implements OnModuleInit {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly pushService: PushService) {}

  async onModuleInit() {
    try {
      await this.pushService.processQueue();
      this.logger.log("Processed push queue on startup");
    } catch (error) {
      this.logger.error("Failed to process push queue on startup", error as Error);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleQueue() {
    try {
      await this.pushService.processQueue();
    } catch (error) {
      this.logger.error("Failed to process push queue", error as Error);
    }
  }
}
