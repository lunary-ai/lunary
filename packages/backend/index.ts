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

await checkDbConnection()
setupCronJobs()

const app = new Koa()

// MiddleWares
app.use(errorMiddleware)
app.use(logger())
app.use(corsMiddleware)
app.use(authMiddleware)
app.use(bodyParser())
app.use(setDefaultBody)

// Routes
app.use(redirections.routes())
app.use(v1.routes())
app.use(auth.routes())
app.use(webhooks.routes())

const PORT = Number(Bun.env.PORT || 3333)
const server = app.listen(PORT, () =>
  console.log(`✅ Koa server listening on port ${PORT}`),
)

prexit(async () => {
  console.log("Shutting down server...")
  await sql.end({ timeout: 5 })
  await new Promise((r) => server.close(r))
})
