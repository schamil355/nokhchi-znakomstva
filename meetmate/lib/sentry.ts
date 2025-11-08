import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn ?? "";

const release = Constants.expoConfig?.version
  ? `${Constants.expoConfig?.slug ?? "meetmate"}@${Constants.expoConfig.version}`
  : undefined;
const dist =
  Constants.expoConfig?.extra?.eas?.buildVersion ??
  Constants.expoConfig?.extra?.eas?.buildProfile ??
  "dev";

export const initSentry = () => {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    release,
    dist,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
  });
};

export const setSentryUser = (user?: { id: string; email?: string } | null) => {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
};
