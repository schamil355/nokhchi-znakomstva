import { Module } from "@nestjs/common";
import { StorageService } from "./services/storage.service";
import { OtpService } from "./services/otp.service";
import { RateLimitService } from "./services/rate-limit.service";
import { RekognitionService } from "./services/rekognition.service";

@Module({
  providers: [StorageService, RekognitionService, OtpService, RateLimitService],
  exports: [StorageService, RekognitionService, OtpService, RateLimitService],
})
export class CommonModule {}
