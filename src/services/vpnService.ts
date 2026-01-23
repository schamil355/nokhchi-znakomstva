import { getApiBase } from "../lib/apiBase";

const ensureApiBase = () => {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("API base URL missing. Please set EXPO_PUBLIC_API_URL.");
  }
  return apiBase;
};

export type VpnCheckResponse = {
  blocked: boolean;
  provider?: string | null;
  reason?: string | null;
  ip?: string | null;
};

export const checkVpnStatus = async (): Promise<VpnCheckResponse> => {
  const response = await fetch(`${ensureApiBase()}/v1/security/vpn-check`, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error("VPN_CHECK_FAILED");
  }

  return response.json();
};
