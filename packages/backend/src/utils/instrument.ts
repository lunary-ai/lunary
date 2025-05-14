import * as Sentry from "@sentry/bun";

export function initSentry() {
  // Sentry will only be active if the DSN valid, and do nothing if not
  Sentry.init({
    dsn: Bun.env.SENTRY_DSN,
  });
}
