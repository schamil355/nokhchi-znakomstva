import { IsIn, IsString } from "class-validator";

const ALLOWED_STATUSES = ["new", "contacted", "won", "lost"] as const;

export class UpdatePartnerLeadDto {
  @IsString()
  @IsIn(ALLOWED_STATUSES as unknown as string[])
  status!: (typeof ALLOWED_STATUSES)[number];
}
