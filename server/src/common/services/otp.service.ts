import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RateLimitService } from "./rate-limit.service";
import crypto from "crypto";

export enum OtpChannel {
  EMAIL = "email",
  SMS = "sms",
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly expirySeconds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitService: RateLimitService,
  ) {
    this.expirySeconds = this.configService.get<number>("otp.expirySeconds", 300);
  }

  async generate(userId: string, channel: OtpChannel): Promise<string> {
    const key = `otp:${userId}:${channel}`;
    if (await this.rateLimitService.isRateLimited(key, 3, 60)) {
      throw new InternalServerErrorException("OTP_RATE_LIMIT");
    }
    const code = crypto.randomInt(100000, 999999).toString();
    await this.rateLimitService.setWithExpiry(key, code, this.expirySeconds);
    return code;
  }

  async verify(userId: string, channel: OtpChannel, code: string): Promise<boolean> {
    const key = `otp:${userId}:${channel}`;
    const value = await this.rateLimitService.get(key);
    if (!value) {
      return false;
    }
    const success = value === code;
    if (success) {
      await this.rateLimitService.delete(key);
    }
    return success;
  }
}
