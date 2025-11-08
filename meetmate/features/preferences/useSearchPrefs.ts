import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { z } from "zod";
import { getSupabase } from "../../lib/supabase";
import { useSessionStore } from "../../store/sessionStore";

const REGION_SCHEMA = z.enum(["NEARBY", "CHECHNYA", "EUROPE", "RUSSIA"]);

const ROW_SCHEMA = z.object({
  user_id: z.string(),
  region_mode: REGION_SCHEMA,
  updated_at: z.string(),
});

export type SearchRegionMode = z.infer<typeof REGION_SCHEMA>;

export type SearchPreferences = {
  userId: string;
  regionMode: SearchRegionMode;
  updatedAt: string;
};

const DEFAULT_REGION: SearchRegionMode = "NEARBY";

const toDomain = (row: z.infer<typeof ROW_SCHEMA>): SearchPreferences => ({
  userId: row.user_id,
  regionMode: row.region_mode,
  updatedAt: row.updated_at,
});

export const getMySearchPrefs = async (userId: string): Promise<SearchPreferences> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("search_prefs")
    .select("user_id, region_mode, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    const parsed = ROW_SCHEMA.parse(data);
    return toDomain(parsed);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("search_prefs")
    .insert({ user_id: userId, region_mode: DEFAULT_REGION })
    .select("user_id, region_mode, updated_at")
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  if (!inserted) {
    throw new Error("Failed to create default search preferences.");
  }
  const parsed = ROW_SCHEMA.parse(inserted);
  return toDomain(parsed);
};

export const updateSearchPrefs = async (
  userId: string,
  input: { regionMode: SearchRegionMode },
): Promise<SearchPreferences> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("search_prefs")
    .upsert({ user_id: userId, region_mode: input.regionMode }, { onConflict: "user_id" })
    .select("user_id, region_mode, updated_at")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to update search preferences.");
  }
  const parsed = ROW_SCHEMA.parse(data);
  return toDomain(parsed);
};

export const useSearchPrefs = () => {
  const userId = useSessionStore((state) => state.user?.id ?? null);
  const queryClient = useQueryClient();

  const queryKey = ["search-prefs", userId];

  const query = useQuery<SearchPreferences>({
    queryKey,
    enabled: Boolean(userId),
    queryFn: () => getMySearchPrefs(userId as string),
  });

  const mutation = useMutation({
    mutationFn: async (payload: { regionMode: SearchRegionMode }) => {
      if (!userId) {
        throw new Error("Missing user id");
      }
      return updateSearchPrefs(userId, payload);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SearchPreferences>(queryKey);
      if (previous) {
        queryClient.setQueryData<SearchPreferences>(queryKey, {
          ...previous,
          regionMode: payload.regionMode,
          updatedAt: new Date().toISOString(),
        });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const update = useCallback(
    (payload: { regionMode: SearchRegionMode }) => mutation.mutateAsync(payload),
    [mutation],
  );

  return {
    prefs: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    update,
    isUpdating: mutation.isLoading,
  };
};
