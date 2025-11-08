import { ApiPropertyOptional } from "@nestjs/swagger";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { OtpChannel } from "../../common/services/otp.service";

export class SendOtpDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  sessionId!: string;

  @ApiPropertyOptional({ enum: OtpChannel })
  @IsOptional()
  @IsEnum(OtpChannel)
  channel?: OtpChannel;
}

export class SendOtpResponseDto {
  @ApiPropertyOptional()
  channel?: OtpChannel;

  @ApiPropertyOptional()
  expiresIn?: number;
}
