import { getApiBase } from "../lib/apiBase";
import { getFreshAccessToken } from "../lib/supabaseClient";

const ensureApiBase = () => {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw Object.assign(new Error("API base URL missing. Please set EXPO_PUBLIC_API_URL."), {
      code: "API_BASE_MISSING",
    });
  }
  return apiBase;
};

const withCode = (code: string, message?: string) =>
  Object.assign(new Error(message ?? code), { code });

const extractErrorMessage = (payload: any, fallback: string) => {
  if (!payload) {
    return fallback;
  }
  const rawMessage = payload.message ?? payload.error ?? fallback;
  if (Array.isArray(rawMessage)) {
    return rawMessage.filter(Boolean).join(", ") || fallback;
  }
  if (typeof rawMessage === "string" && rawMessage.trim().length > 0) {
    return rawMessage;
  }
  return fallback;
};

export type PartnerLeadInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  city: string;
  region?: string | null;
  monthlyVolume?: string | null;
  packageInterest?: string | null;
  notes?: string | null;
  locale?: string | null;
};

export type PartnerLeadRecord = {
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

export type PartnerLeadsResponse = {
  items: PartnerLeadRecord[];
  count: number;
  limit: number;
  offset: number;
};

export const submitPartnerLead = async (payload: PartnerLeadInput): Promise<{ id?: string | null }> => {
  const response = await fetch(`${ensureApiBase()}/v1/partner-leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Submission failed.";
    try {
      const data = await response.json();
      message = extractErrorMessage(data, message);
    } catch {
      // ignore parse errors
    }
    throw withCode("PARTNER_LEAD_FAILED", message);
  }

  try {
    return (await response.json()) as { id?: string | null };
  } catch {
    return { id: null };
  }
};

export const fetchPartnerLeads = async (params: { limit?: number; offset?: number } = {}): Promise<PartnerLeadsResponse> => {
  const token = await getFreshAccessToken();
  if (!token) {
    throw withCode("AUTH_REQUIRED", "Not authenticated.");
  }
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const response = await fetch(
    `${ensureApiBase()}/v1/admin/partner-leads?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    let message = "Failed to load leads.";
    try {
      const data = await response.json();
      message = extractErrorMessage(data, message);
    } catch {
      // ignore parse errors
    }
    throw withCode("PARTNER_LEADS_FAILED", message);
  }

  return (await response.json()) as PartnerLeadsResponse;
};
