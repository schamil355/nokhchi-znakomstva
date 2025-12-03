import { useQuery } from "@tanstack/react-query";
import { fetchDiscoveryFeed, fetchRecentProfiles } from "../services/discoveryService";
import { useAuthStore } from "../state/authStore";
import { usePreferencesStore } from "../state/preferencesStore";

export const useDiscoveryFeed = () => {
  const session = useAuthStore((state) => state.session);
  const filters = usePreferencesStore((state) => state.filters);
  const profile = useAuthStore((state) => state.profile);
  const origin = profile
    ? {
        latitude: profile.latitude ?? null,
        longitude: profile.longitude ?? null
      }
    : null;

  return useQuery({
    queryKey: ["discovery", session?.user.id, filters, origin?.latitude ?? null, origin?.longitude ?? null],
    queryFn: () => (session ? fetchDiscoveryFeed(session.user.id, filters, origin) : []),
    enabled: Boolean(session)
  });
};

export const useRecentProfiles = (enabled = true) => {
  const session = useAuthStore((state) => state.session);
  const filters = usePreferencesStore((state) => state.filters);
  const profile = useAuthStore((state) => state.profile);
  const origin = profile
    ? {
        latitude: profile.latitude ?? null,
        longitude: profile.longitude ?? null
      }
    : null;

  return useQuery({
    queryKey: ["recent-profiles", session?.user.id, filters, origin?.latitude ?? null, origin?.longitude ?? null],
    queryFn: () => (session ? fetchRecentProfiles(session.user.id, filters, origin) : []),
    enabled: Boolean(session) && enabled
  });
};
