import Constants from "expo-constants";

const rawApiBase =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  null;
const API_BASE = rawApiBase ? rawApiBase.replace(/\/$/, "") : null;

const ensureApiBase = () => {
  if (!API_BASE) {
    throw new Error("API base URL missing. Please set EXPO_PUBLIC_API_URL.");
  }
  return API_BASE;
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
