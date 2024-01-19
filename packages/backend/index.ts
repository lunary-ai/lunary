import Koa from "koa"
import bodyParser from "koa-bodyparser"
import logger from "koa-logger"

import auth from "./api/v1/auth"
import v1 from "./api/v1"
import redirections from "./api/v1/redirections"
import webhooks from "./api/webhooks"
import { corsMiddleware } from "./utils/cors"
import { setupCronJobs } from "./utils/cron"
import { checkDbConnection } from "./utils/db"
import { z } from "zod"
import { authMiddleware } from "./api/v1/auth/utils"

await checkDbConnection()
setupCronJobs()

// You can also use CommonJS `require('@sentry/node')` instead of `import`
import * as Sentry from "@sentry/node"
import { ProfilingIntegration } from "@sentry/profiling-node"
import { stripUrlQueryAndFragment } from "@sentry/utils"

const app = new Koa()

Sentry.init({
  dsn: "https://39824297fdaaaa06ab62a4d077cdfc8b@o4506599397588992.ingest.sentry.io/4506599400407040",
  integrations: [
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
    new ProfilingIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
})

const requestHandler = (ctx, next) => {
  return new Promise((resolve, reject) => {
    Sentry.runWithAsyncContext(async () => {
      const hub = Sentry.getCurrentHub()
      hub.configureScope((scope) =>
        scope.addEventProcessor((event) =>
          Sentry.addRequestDataToEvent(event, ctx.request, {
            include: {
              user: false,
            },
          }),
        ),
      )

      try {
        await next()
      } catch (err) {
        reject(err)
      }
      resolve()
    })
  })
}

// This tracing middleware creates a transaction per request
const tracingMiddleWare = async (ctx, next) => {
  const reqMethod = (ctx.method || "").toUpperCase()
  const reqUrl = ctx.url && stripUrlQueryAndFragment(ctx.url)

  // Connect to trace of upstream app
  let traceparentData
  if (ctx.request.get("sentry-trace")) {
    traceparentData = Sentry.extractTraceparentData(
      ctx.request.get("sentry-trace"),
    )
  }

  const transaction = Sentry.startTransaction({
    name: `${reqMethod} ${reqUrl}`,
    op: "http.server",
    ...traceparentData,
  })

  ctx.__sentry_transaction = transaction

  // We put the transaction on the scope so users can attach children to it
  Sentry.getCurrentHub().configureScope((scope) => {
    scope.setSpan(transaction)
  })

  ctx.res.on("finish", () => {
    // Push `transaction.finish` to the next event loop so open spans have a chance to finish before the transaction closes
    setImmediate(() => {
      // If you're using koa router, set the matched route as transaction name
      if (ctx._matchedRoute) {
        const mountPath = ctx.mountPath || ""
        transaction.setName(`${reqMethod} ${mountPath}${ctx._matchedRoute}`)
      }
      transaction.setHttpStatus(ctx.status)
      transaction.finish()
    })
  })

  await next()
}

app.use(requestHandler)
app.use(tracingMiddleWare)

// Send errors to Sentry
app.on("error", (err, ctx) => {
  Sentry.withScope((scope) => {
    scope.addEventProcessor((event) => {
      return Sentry.addRequestDataToEvent(event, ctx.request)
    })
    Sentry.captureException(err)
  })
})

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (error: unknown) {
    console.error(error)

    if (error instanceof z.ZodError) {
      ctx.status = 422
      ctx.body = error.errors[0]
      return
    }

    ctx.status = error.statusCode || error.status || 500
    ctx.body = {
      message: error.message,
    }
  }
})

// MiddleWares
app.use(logger())
app.use(corsMiddleware)
app.use(authMiddleware)

app.use(bodyParser())

// Routes
app.use(redirections.routes())
app.use(v1.routes())
app.use(auth.routes())
app.use(webhooks.routes())

const PORT = Number(Bun.env.PORT || 3333)
app.listen(PORT, () => console.log(`✅ Koa server listening on port ${PORT}`))
