import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AdminGuard } from "../common/guards/admin.guard";
import { getSupabaseAdminClient } from "../common/supabase-admin";

type AdminMetricsResponse = {
  gender: Record<string, number>;
  incognito: number;
  regions: Record<string, number>;
};

type PartnerLeadRecord = {
  id: string;
  created_at: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  city: string;
  region?: string | null;
  monthly_volume?: string | null;
  package_interest?: string | null;
  notes?: string | null;
  locale?: string | null;
  source?: string | null;
  status?: string | null;
};

type PartnerLeadsResponse = {
  items: PartnerLeadRecord[];
  count: number;
  limit: number;
  offset: number;
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

  @Get("partner-leads")
  async getPartnerLeads(
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string
  ): Promise<PartnerLeadsResponse> {
    const limit = Math.max(1, Math.min(200, Number.parseInt(limitRaw ?? "50", 10) || 50));
    const offset = Math.max(0, Number.parseInt(offsetRaw ?? "0", 10) || 0);
    const { data, error, count } = await this.supabase
      .from("partner_leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException("ADMIN_PARTNER_LEADS_FAILED");
    }

    return {
      items: (data ?? []) as PartnerLeadRecord[],
      count: count ?? 0,
      limit,
      offset,
    };
  }
}
