export type VisibilityMode = "public" | "match_only" | "whitelist" | "blurred_until_match";

type VisibilityOptions = {
  mode: VisibilityMode;
  isOwner: boolean;
  hasMatch: boolean;
  hasWhitelist: boolean;
};

export const canAccessOriginal = ({ mode, isOwner, hasMatch, hasWhitelist }: VisibilityOptions): boolean => {
  if (isOwner) return true;
  switch (mode) {
    case "public":
      return true;
    case "match_only":
      return hasMatch;
    case "whitelist":
      return hasWhitelist;
    case "blurred_until_match":
      return hasMatch;
    default:
      return false;
  }
};
