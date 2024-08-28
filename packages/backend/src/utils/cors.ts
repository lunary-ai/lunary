import cors from "@koa/cors"
import { Context, Next } from "koa"
import { createMiddleware } from "./middleware"

async function patchedCors(ctx: Context, next: Next) {
  const origin =
    process.env.NODE_ENV !== "production"
      ? ctx.get("Origin") || "*"
      : process.env.APP_URL!

  if (ctx.method === "options") {
    ctx.set("Access-Control-Allow-Origin", origin)
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS, DELETE")
    ctx.set("Access-Control-Allow-Credentials", "true")
    ctx.set(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, fdi-version, rid, st-auth-mode, Authorization",
    )
    ctx.status = 204
    return
  }

  await cors({
    origin,
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  })(ctx, next)
}

export const corsMiddleware = createMiddleware(patchedCors)
