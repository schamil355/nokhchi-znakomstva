import { useQuery } from "@tanstack/react-query";
import { fetchDiscoveryFeed } from "../services/discoveryService";
import { useAuthStore } from "../state/authStore";
import { usePreferencesStore } from "../state/preferencesStore";

export const useDiscoveryFeed = () => {
  const session = useAuthStore((state) => state.session);
  const filters = usePreferencesStore((state) => state.filters);

  return useQuery({
    queryKey: ["discovery", session?.user.id, filters],
    queryFn: () =>
      session
        ? fetchDiscoveryFeed(session.user.id, {
            userId: session.user.id,
            genders: filters.genders,
            intentions: filters.intentions,
            ageRange: filters.ageRange
          })
        : [],
    enabled: Boolean(session)
  });
};
