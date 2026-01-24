import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CreatePartnerLeadDto {
  @IsString()
  @MaxLength(140)
  companyName!: string;

  @IsString()
  @MaxLength(120)
  contactName!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  monthlyVolume?: string;

  @IsOptional()
  @IsString()
  @IsIn(["starter", "pro", "enterprise", "unsure"])
  packageInterest?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}
