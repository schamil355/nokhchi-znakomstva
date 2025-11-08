import { Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class GrantPhotoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  photoId!: number;

  @IsString()
  viewerId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  expiresInSeconds?: number;
}
