import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class OverrideVerificationDto {
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
