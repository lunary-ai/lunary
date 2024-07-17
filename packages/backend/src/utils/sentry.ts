import * as Sentry from "@sentry/node"
import { ProfilingIntegration } from "@sentry/profiling-node"
import { stripUrlQueryAndFragment } from "@sentry/utils"
import { Next } from "koa"
import Context from "./koa"

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DNS,
    integrations: [
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  })
}

export function requestHandler(ctx: Context, next: Next) {
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
      resolve(null)
    })
  })
}

export function sendErrorToSentry(err: unknown, ctx: Context) {
  Sentry.withScope((scope) => {
    scope.addEventProcessor((event) => {
      return Sentry.addRequestDataToEvent(event, ctx.request)
    })
    scope.setUser({ id: ctx.state.userId })
    scope.setTag("IP Address", ctx.get("Cf-Connecting-Ip"))
    Sentry.captureException(err)
  })
}

export async function tracingMiddleWare(ctx: Context, next: Next) {
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
