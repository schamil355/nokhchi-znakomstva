import { ApiProperty } from "@nestjs/swagger";

export class VerificationStatusResponseDto {
  @ApiProperty({ format: "uuid" })
  sessionId!: string;

  @ApiProperty({ enum: ["pending", "selfie_ok", "otp_ok", "completed", "failed"] })
  status!: string;

  @ApiProperty({ required: false })
  similarityScore?: number;

  @ApiProperty({ required: false })
  livenessScore?: number;

  @ApiProperty({ required: false })
  failureReason?: string;

  @ApiProperty({ required: false })
  expiresAt?: string;
}
