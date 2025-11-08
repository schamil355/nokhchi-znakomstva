import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional } from "class-validator";

export class ViewPhotoDto {
  @Type(() => Number)
  @IsNumber()
  photoId!: number;

  @IsOptional()
  @IsEnum(["original", "blur"], {
    message: "variant must be 'original' or 'blur'",
  })
  variant?: "original" | "blur";
}
