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

const globalScope = globalThis as unknown as {
  __sentryConsoleWrapped?: boolean;
};

const isErrorLike = (value: unknown): value is Error =>
  value instanceof Error ||
  (typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as any).message === "string" &&
    "stack" in value);

const extractConsoleError = (args: unknown[]) => {
  for (const arg of args) {
    if (isErrorLike(arg)) {
      return arg as Error;
    }
  }
  return null;
};

if (dsn && typeof console !== "undefined" && !globalScope.__sentryConsoleWrapped) {
  globalScope.__sentryConsoleWrapped = true;
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    const err = extractConsoleError(args);
    if (err && !(err as any).__sentryCaptured) {
      (err as any).__sentryCaptured = true;
      Sentry.captureException(err, { tags: { source: "console_warn" } });
    }
  };

  console.error = (...args: unknown[]) => {
    originalError(...args);
    const err = extractConsoleError(args);
    if (err && !(err as any).__sentryCaptured) {
      (err as any).__sentryCaptured = true;
      Sentry.captureException(err, { tags: { source: "console_error" } });
    }
  };
}

export default Sentry;
