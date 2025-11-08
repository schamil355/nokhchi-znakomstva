import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsUUID } from "class-validator";

export class UploadSelfieDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ description: "Flag sent by mobile client ensuring camera capture" })
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  captureFlag!: boolean;
}

export class UploadSelfieResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty()
  similarity!: number;

  @ApiProperty({ example: "otp" })
  next!: string;
}
