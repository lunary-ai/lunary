import Koa from "koa"
import bodyParser from "koa-bodyparser"
import logger from "koa-logger"
import { middleware } from "supertokens-node/framework/koa"

import v1 from "./api/v1"
import webhooks from "./api/webhooks"
import { authMiddleware, setupAuth } from "./utils/auth"
import { setupCronJobs } from "./utils/cron"
import { checkDbConnection } from "./utils/db"
import redirections from "./api/v1/redirections"
import { corsMiddleware } from "./utils/cors"
import auth from "./api/auth"

await checkDbConnection()
setupCronJobs()
setupAuth()

const app = new Koa()

// MiddleWares
app.use(logger())
app.use(corsMiddleware)
app.use(middleware())
app.use(authMiddleware)

app.use(bodyParser())

// Routes
app.use(redirections.routes())
app.use(v1.routes())
app.use(auth.routes())
app.use(webhooks.routes())

const PORT = Number(Bun.env.PORT || 3333)
app.listen(PORT, () => console.log(`✅ Koa server listening on port ${PORT}`))
