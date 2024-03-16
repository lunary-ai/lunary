import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import * as jose from "jose"
import { SignJWT } from "jose"
import { Next } from "koa"
import * as argon2 from "argon2"

import bcrypt from "bcrypt"
import { validateUUID } from "@/src/utils/misc"

export function sanitizeEmail(email: string) {
  return email.toLowerCase().trim()
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    return argon2.verify(hash, password)
  } else if (
    hash.startsWith("$2a") ||
    hash.startsWith("$2b") ||
    hash.startsWith("$2y")
  ) {
    return bcrypt.compare(password, hash)
  } else {
    throw new Error("Unknown hash type")
  }
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password)
}

const ONE_MONTH = 60 * 60 * 24 * 30

export function signJwt(
  payload: any,
  expiresIn: number = ONE_MONTH,
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + expiresIn

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))
}

export function verifyJwt<Payload>(token: string) {
  return jose.jwtVerify<Payload>(
    token,
    new TextEncoder().encode(process.env.JWT_SECRET),
  )
}

// TODO: shared
interface SessionData {
  userId: string
  email: string
  orgId: string
}

const publicRoutes = [
  new RegExp(`/auth/.+`),
  "/api/report", // required legacy route
  "/api/v1/template", // legacy template route
  "/v1/health",
  "/v1/health-check",
  "/webhooks/stripe",
  "/auth/user/password/reset",
  `/v1/runs/ingest`,
  new RegExp(`/v1/runs/.+/public`), // public run data
  new RegExp(`/v1/runs/.+/feedback`), // getFeedback in SDKs
  `/v1/template_versions/latest`,
  "/v1/users/verify-email",
  "/v1/users/send-verification",
  new RegExp(`/v1/datasets/.+`), // getDataSets in SDKs
  `/v1/evaluations/run`,
]

// TODO: we need to refactor this / find a more elegant way to use this middleware because it doesn't make any sense what's hapenning here
export async function authMiddleware(ctx: Context, next: Next) {
  ctx.state.projectId = ctx.request?.query?.projectId as string

  const isPublicRoute = publicRoutes.some((route) =>
    typeof route === "string" ? route === ctx.path : route.test(ctx.path),
  )

  const bearerToken = ctx.request?.headers?.authorization?.split(" ")[1]

  if (isPublicRoute) {
    if (validateUUID(bearerToken)) {
      ctx.state.projectId = bearerToken as string
    }
    await next()
    return
  }

  try {
    if (!bearerToken) {
      throw new Error("No bearer token provided.")
    }
    const { payload } = await verifyJwt<SessionData>(bearerToken)

    ctx.state.userId = payload.userId
    ctx.state.orgId = payload.orgId

    if (ctx.state.projectId) {
      // CHeck if user has access to project

      const [project] = await sql`
        select id from project where id = ${ctx.state.projectId} and org_id = ${ctx.state.orgId}
      `

      if (!project) {
        throw new Error("Project not found")
      }
    }
  } catch (error) {
    console.error(error)
    ctx.status = 401
    ctx.body = {
      error: "Unauthorized",
      message: "You must be logged in to access this page",
    }
    return
  }

  await next()
}
