import * as Sentry from "@sentry/nextjs";
import config from "./utils/config";

export async function register() {
  if (!config.IS_CLOUD) {
    return;
  }
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
