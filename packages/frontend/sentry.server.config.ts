// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import config from "./utils/config";

Sentry.init({
  dsn: config.IS_CLOUD
    ? "https://c714dfeb448caef6e12e281ad1e9250e@o4509293498728448.ingest.de.sentry.io/4509293501808720"
    : null,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
