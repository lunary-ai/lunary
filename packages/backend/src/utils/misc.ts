import { Context, Next } from "koa"

export async function setDefaultBody(ctx: Context, next: Next) {
  await next()

  if (!ctx.body === undefined && ctx.status > 200 && ctx.status < 300) {
    ctx.body = {}
  }
}
