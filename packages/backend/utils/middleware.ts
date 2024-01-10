import { Context, Next } from "koa"

export function createMiddleware(
  handler: (ctx: Context, next: Next) => Promise<void>,
) {
  return async (ctx: Context, next: Next) => {
    await handler(ctx, next)
  }
}
