import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enableInExpoDevelopment: true,
  debug: __DEV__,
  tracesSampleRate: 0.2,
  enableNative: true
});

export default Sentry;
