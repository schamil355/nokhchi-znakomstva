import { ApiProperty } from "@nestjs/swagger";

export class StartVerificationResponseDto {
  @ApiProperty({ format: "uuid" })
  sessionId!: string;

  @ApiProperty({ type: [String], example: ["selfie", "otp"] })
  steps!: string[];

  @ApiProperty({ example: "2024-04-01T12:34:56Z" })
  expiresAt!: string;
}
