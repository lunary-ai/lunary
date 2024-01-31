import { Context, Next } from "koa"

export async function setDefaultBody(ctx: Context, next: Next) {
  ctx.body = {}
  await next()
}
