import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, Length } from "class-validator";

export class VerifyOtpDto {
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ minLength: 4, maxLength: 6 })
  @IsString()
  @Length(4, 6)
  code!: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty()
  status!: string;
}
