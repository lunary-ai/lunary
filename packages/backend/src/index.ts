import Koa from "koa";
import bodyParser from "koa-bodyparser";
import logger from "koa-logger";

import v1 from "./api/v1";
import auth from "./api/v1/auth";
import { authMiddleware } from "./api/v1/auth/utils";
import redirections from "./api/v1/redirections";
import webhooks from "./api/webhooks";
import otel from "./api/otel";
import { createIndexes } from "./create-indexes";
import { checkEmailServerConnection } from "./emails";
import { startJobWorker } from "./jobs";
import { startMaterializedViewRefreshJob } from "./jobs/materialized-views";
import { cacheAnalyticsMiddleware } from "./utils/cache";
import config from "./utils/config";
import { corsMiddleware } from "./utils/cors";
import { setupCronJobs } from "./utils/cron";
import sql, { checkDbConnection } from "./utils/db";
import { errorMiddleware } from "./utils/errors";
import licenseMiddleware from "./utils/license";
import { setDefaultBody } from "./utils/misc";
import ratelimit from "./utils/ratelimit";
import { initSentry } from "./utils/instrument";

initSentry();

checkDbConnection();
checkEmailServerConnection();

createIndexes();
if (process.env.NODE_ENV === "production") {
  setupCronJobs();
  startJobWorker();
  startMaterializedViewRefreshJob();
}

const app = new Koa();
app.proxy = true; // Forward proxy headers

// MiddleWares
app.use(errorMiddleware);
if (
  process.env.NODE_ENV === "production" ||
  process.env.LUNARY_DEBUG === "true"
) {
  app.use(logger());
}

app.use(corsMiddleware);
app.use(authMiddleware);
app.use(ratelimit);
if (process.env.NODE_ENV === "production") {
  app.use(cacheAnalyticsMiddleware);
}

app.use(async (ctx, next) => {
  // Skip body parsing for protobuf content
  if (
    ctx.request.headers["content-type"]?.startsWith("application/x-protobuf")
  ) {
    const chunks: Buffer[] = [];
    for await (const chunk of ctx.req) {
      chunks.push(chunk);
    }
    ctx.request.body = Buffer.concat(chunks);
    await next();
  } else {
    // Use regular body parser for everything else
    await bodyParser({
      jsonLimit: "20mb",
      textLimit: "20mb",
      xmlLimit: "20mb",
      formLimit: "20mb",
    })(ctx, next);
  }
});
app.use(setDefaultBody);

if (config.IS_SELF_HOSTED) {
  app.use(licenseMiddleware);
}

// Routes
app.use(redirections.routes());
app.use(v1.routes());
app.use(auth.routes());
app.use(webhooks.routes());
app.use(otel.routes());

const PORT = Number(process.env.PORT || 3333);
const server = app.listen(PORT, () =>
  console.info(`✅ Lunary API server listening on port ${PORT}`),
);

process.on("exit", async () => {
  console.info("Shutting down server...");
  await sql.end({ timeout: 5 });
  await new Promise((r) => server.close(r));
});
