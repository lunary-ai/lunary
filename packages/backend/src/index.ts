import Koa from "koa"
import bodyParser from "koa-bodyparser"
import logger from "koa-logger"
import prexit from "prexit"

import v1 from "./api/v1"
import auth from "./api/v1/auth"
import { authMiddleware } from "./api/v1/auth/utils"
import redirections from "./api/v1/redirections"
import webhooks from "./api/webhooks"
import { corsMiddleware } from "./utils/cors"
import { setupCronJobs } from "./utils/cron"
import sql, { checkDbConnection } from "./utils/db"
import { errorMiddleware } from "./utils/errors"
import { setDefaultBody } from "./utils/misc"
import ratelimit from "./utils/ratelimit"
import { initSentry, requestHandler, tracingMiddleWare } from "./utils/sentry"
import licenseMiddleware from "./utils/license"
import config from "./utils/config"

checkDbConnection()
setupCronJobs()
initSentry()

const app = new Koa()

// Forward proxy headers
app.proxy = true

// MiddleWares
app.use(requestHandler)
app.use(tracingMiddleWare)
app.use(errorMiddleware)
app.use(logger())
app.use(corsMiddleware)
app.use(authMiddleware)

app.use(ratelimit)
app.use(bodyParser())
app.use(setDefaultBody)

if (config.IS_SELF_HOSTED) {
  app.use(licenseMiddleware)
}

// Routes
app.use(redirections.routes())
app.use(v1.routes())
app.use(auth.routes())
app.use(webhooks.routes())

const PORT = Number(process.env.PORT || 3333)
const server = app.listen(PORT, () =>
  console.log(`✅ Lunary API server listening on port ${PORT}`),
)

prexit(async () => {
  console.log("Shutting down server...")
  await sql.end({ timeout: 5 })
  await new Promise((r) => server.close(r))
})
