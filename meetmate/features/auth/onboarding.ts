import { useQuery } from "@tanstack/react-query";
import { fetchProfileForUser, isProfileComplete } from "../profile";
import { useSessionStore } from "../../store/sessionStore";
import { useFeatureFlag } from "../../lib/featureFlags";

export const useProfileCompletion = () => {
  const session = useSessionStore((state) => state.session);
  const verificationRequired = useFeatureFlag("verification_required_on_signup");

  const profileQuery = useQuery({
    queryKey: ["profile", session?.user.id],
    enabled: Boolean(session?.user.id),
    queryFn: () => fetchProfileForUser(session!.user.id),
  });

  const profile = profileQuery.data ?? null;
  const verifiedAt = profile?.verifiedAt ? new Date(profile.verifiedAt) : null;
  const updatedAt = profile?.updatedAt ? new Date(profile.updatedAt) : null;
  const needsVerification = Boolean(
    verificationRequired &&
      (!verifiedAt || (updatedAt && verifiedAt && updatedAt > verifiedAt)),
  );

  return {
    profile,
    isComplete: isProfileComplete(profile),
    isLoading: profileQuery.isLoading,
    isVerified: Boolean(verifiedAt),
    needsVerification,
  };
};
