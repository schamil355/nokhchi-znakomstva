import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { IsBoolean, IsNumber, IsOptional, Min } from "class-validator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { getSupabaseAdminClient } from "../common/supabase-admin";

class UpdatePrivacyDto {
  @IsOptional()
  @IsBoolean()
  is_incognito?: boolean;

  @IsOptional()
  @IsBoolean()
  show_distance?: boolean;

  @IsOptional()
  @IsBoolean()
  show_last_seen?: boolean;

  @IsOptional()
  @IsBoolean()
  hide_nearby?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hide_nearby_radius?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

@ApiTags("settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("v1/settings/privacy")
export class PrivacyController {
  private readonly supabase = getSupabaseAdminClient();

  @Post()
  async update(@Req() req: Request, @Body() body: UpdatePrivacyDto) {
    const userId = req.user?.id as string;
    const updates: Record<string, boolean | number> = {};
    if (body.is_incognito !== undefined) {
      updates.is_incognito = body.is_incognito;
    }
    if (body.show_distance !== undefined) {
      updates.show_distance = body.show_distance;
    }
    if (body.show_last_seen !== undefined) {
      updates.show_last_seen = body.show_last_seen;
    }
    if (body.hide_nearby !== undefined) {
      updates.hide_nearby = body.hide_nearby;
    }
    if (body.hide_nearby_radius !== undefined) {
      updates.hide_nearby_radius = body.hide_nearby_radius;
    }
    if (body.latitude !== undefined) {
      updates.latitude = body.latitude;
    }
    if (body.longitude !== undefined) {
      updates.longitude = body.longitude;
    }
    if (!Object.keys(updates).length) {
      throw new BadRequestException("NO_FIELDS_PROVIDED");
    }
    const { error } = await this.supabase.from("profiles").update(updates).eq("id", userId);
    if (error) {
      throw new BadRequestException("PRIVACY_UPDATE_FAILED");
    }
    return { ok: true };
  }
}
