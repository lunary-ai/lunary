import { Context, Next } from "koa"
import { z } from "zod"
import { sendErrorToSentry } from "./sentry"

export async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next()
    const status = ctx.status || 404
    if (status === 404) {
      ctx.throw(404, "Not Found")
    }
  } catch (error: any) {
    console.error(error)
    sendErrorToSentry(error, ctx)

    if (error instanceof z.ZodError) {
      ctx.status = 422
      ctx.body = {
        error: "Error",
        message: error.errors[0].message,
      }
      console.log("ZOD ERROR", error.errors[0])
      return
    }

    ctx.status = error.statusCode || error.status || 500
    ctx.body = {
      message: error.message || "An unexpected error occurred",
    }
  }
}
