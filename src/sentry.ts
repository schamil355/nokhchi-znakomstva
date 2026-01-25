import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enableInExpoDevelopment: true,
  debug: __DEV__,
  tracesSampleRate: 0.2,
  enableNative: true
});

if (dsn && typeof window !== "undefined") {
  const win = window as unknown as { __sentryManualHandlers?: boolean };
  if (!win.__sentryManualHandlers) {
    win.__sentryManualHandlers = true;
    window.addEventListener(
      "error",
      (event) => {
        const err = (event as ErrorEvent).error ?? new Error((event as ErrorEvent).message || "Unhandled error");
        Sentry.captureException(err, {
          tags: { source: "global_error" }
        });
      },
      { capture: true }
    );
    window.addEventListener(
      "unhandledrejection",
      (event) => {
        const reason = (event as PromiseRejectionEvent).reason ?? "Unhandled rejection";
        const err = reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : "Unhandled rejection");
        Sentry.captureException(err, {
          tags: { source: "global_rejection" }
        });
      },
      { capture: true }
    );
  }
}

export default Sentry;
