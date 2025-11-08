import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "./supabase";

export type FeatureFlagMap = Record<string, boolean>;

const DEFAULT_FLAGS: FeatureFlagMap = {
  paywall_rollout: false,
  verification_required_on_signup: true,
};

export const fetchFeatureFlags = async (): Promise<FeatureFlagMap> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("config")
    .select("payload")
    .eq("name", "feature_flags")
    .maybeSingle<{ payload: FeatureFlagMap }>();
  if (error) {
    console.warn("Failed to fetch feature flags", error);
    return DEFAULT_FLAGS;
  }
  return {
    ...DEFAULT_FLAGS,
    ...(data?.payload ?? {}),
  };
};

export const useFeatureFlags = () =>
  useQuery({
    queryKey: ["feature-flags"],
    queryFn: fetchFeatureFlags,
    initialData: DEFAULT_FLAGS,
    staleTime: 60_000,
  });

export const useFeatureFlag = (flag: keyof FeatureFlagMap) => {
  const { data } = useFeatureFlags();
  return Boolean(data?.[flag]);
};
