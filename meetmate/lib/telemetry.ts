import * as Sentry from "@sentry/react-native";

export type TelemetryEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

export const trackTelemetry = ({ name, properties }: TelemetryEvent) => {
  if (__DEV__) {
    console.log(`[telemetry] ${name}`, properties ?? {});
  }

  try {
    Sentry.addBreadcrumb({
      category: "telemetry",
      message: name,
      data: properties,
      level: "info",
    });
  } catch (error) {
    console.warn("Failed to record telemetry", error);
  }
};
