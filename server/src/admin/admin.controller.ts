import { BadRequestException, Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AdminGuard } from "../common/guards/admin.guard";
import { getSupabaseAdminClient } from "../common/supabase-admin";

type AdminMetricsResponse = {
  gender: Record<string, number>;
  incognito: number;
  regions: Record<string, number>;
};

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("v1/admin")
export class AdminController {
  private readonly supabase = getSupabaseAdminClient();

  @Get("stats")
  async getStats(): Promise<AdminMetricsResponse> {
    const { data, error } = await this.supabase.rpc("admin_profile_metrics");
    if (error) {
      throw new BadRequestException("ADMIN_STATS_FAILED");
    }
    const payload = (data as AdminMetricsResponse) ?? { gender: {}, incognito: 0, regions: {} };
    return {
      gender: {
        male: payload.gender?.male ?? 0,
        female: payload.gender?.female ?? 0,
        nonbinary: payload.gender?.nonbinary ?? 0,
        unknown: payload.gender?.unknown ?? 0,
      },
      incognito: payload.incognito ?? 0,
      regions: {
        ingushetia: payload.regions?.ingushetia ?? 0,
        chechnya: payload.regions?.chechnya ?? 0,
        russia: payload.regions?.russia ?? 0,
        europe: payload.regions?.europe ?? 0,
        other: payload.regions?.other ?? 0,
      },
    };
  }
}
