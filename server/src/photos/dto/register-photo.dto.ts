import { IsIn, IsString } from "class-validator";

export const visibilityModes = ["public", "match_only", "whitelist", "blurred_until_match"] as const;
export type VisibilityMode = (typeof visibilityModes)[number];

export class RegisterPhotoDto {
  @IsString()
  storagePath!: string;

  @IsIn(visibilityModes, {
    message: `visibility_mode must be one of: ${visibilityModes.join(", ")}`,
  })
  visibility_mode!: VisibilityMode;
}
