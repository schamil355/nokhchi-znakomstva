import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { getSupabaseAdminClient } from "../common/supabase-admin";
import type { CreatePartnerLeadDto } from "./dto/create-partner-lead.dto";

export type PartnerLeadRecord = {
  id?: string | null;
  created_at?: string | null;
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

@Injectable()
export class PartnerLeadsService {
  private readonly logger = new Logger(PartnerLeadsService.name);
  private readonly supabase = getSupabaseAdminClient();

  async createLead(dto: CreatePartnerLeadDto) {
    const payload: PartnerLeadRecord = {
      company_name: dto.companyName.trim(),
      contact_name: dto.contactName.trim(),
      email: dto.email.trim(),
      phone: dto.phone?.trim() || null,
      city: dto.city.trim(),
      region: dto.region?.trim() || null,
      monthly_volume: dto.monthlyVolume?.trim() || null,
      package_interest: dto.packageInterest ?? null,
      notes: dto.notes?.trim() || null,
      locale: dto.locale?.trim() || null,
      source: "web",
      status: "new",
    };

    const { data, error } = await this.supabase
      .from("partner_leads")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      this.logger.warn(`Failed to insert partner lead: ${error.message}`);
      throw error;
    }

    const record: PartnerLeadRecord = {
      ...payload,
      id: data?.id ?? null,
      created_at: data?.created_at ?? new Date().toISOString(),
    };

    void this.notifyLead(record);

    return { id: record.id };
  }

  private async notifyLead(lead: PartnerLeadRecord) {
    const apiKey = process.env.RESEND_API_KEY ?? "";
    const toRaw = process.env.PARTNER_LEADS_EMAIL_TO ?? "";
    const from = process.env.PARTNER_LEADS_EMAIL_FROM ?? "";
    if (!apiKey || !from || !toRaw) {
      this.logger.warn("Lead email notification skipped (missing RESEND_API_KEY or PARTNER_LEADS_EMAIL_TO/FROM)");
      return;
    }

    const to = toRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (to.length === 0) {
      this.logger.warn("Lead email notification skipped (empty recipient list)");
      return;
    }

    const subject = `New partner lead: ${lead.company_name}`;
    const text = [
      `Company: ${lead.company_name}`,
      `Contact: ${lead.contact_name}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone ?? "-"}`,
      `City: ${lead.city}`,
      `Region: ${lead.region ?? "-"}`,
      `Package: ${lead.package_interest ?? "-"}`,
      `Volume: ${lead.monthly_volume ?? "-"}`,
      `Notes: ${lead.notes ?? "-"}`,
      `Locale: ${lead.locale ?? "-"}`,
      `Created: ${lead.created_at ?? "-"}`,
    ].join("\n");

    try {
      await axios.post(
        "https://api.resend.com/emails",
        {
          from,
          to,
          subject,
          text,
          html: `
            <div style="font-family: Arial, sans-serif; color: #111;">
              <h2 style="margin: 0 0 16px;">New partner lead</h2>
              <table style="border-collapse: collapse; width: 100%;">
                ${this.row("Company", lead.company_name)}
                ${this.row("Contact", lead.contact_name)}
                ${this.row("Email", lead.email)}
                ${this.row("Phone", lead.phone ?? "-")}
                ${this.row("City", lead.city)}
                ${this.row("Region", lead.region ?? "-")}
                ${this.row("Package", lead.package_interest ?? "-")}
                ${this.row("Volume", lead.monthly_volume ?? "-")}
                ${this.row("Notes", lead.notes ?? "-")}
                ${this.row("Locale", lead.locale ?? "-")}
                ${this.row("Created", lead.created_at ?? "-")}
              </table>
            </div>
          `,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Lead email notification failed: ${message}`);
    }
  }

  private row(label: string, value: string) {
    return `
      <tr>
        <td style="padding: 6px 8px; font-weight: 600; border-bottom: 1px solid #eee; width: 140px;">${label}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${value}</td>
      </tr>
    `;
  }
}
