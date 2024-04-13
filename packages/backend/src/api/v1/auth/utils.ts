import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import * as jose from "jose"
import { SignJWT } from "jose"
import { Next } from "koa"
import * as argon2 from "argon2"

import bcrypt from "bcrypt"
import { validateUUID } from "@/src/utils/misc"
import { sendEmail } from "@/src/utils/sendEmail"
import { RESET_PASSWORD } from "@/src/utils/emails"

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

export function signJWT(
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

export function verifyJWT<Payload>(token: string) {
  return jose.jwtVerify<Payload & { iat: number; exp: number; nbf: number }>(
    token,
    new TextEncoder().encode(process.env.JWT_SECRET),
  )
}

export async function isJWTExpired(token: string) {
  try {
    await verifyJWT(token)
    return false
  } catch (error) {
    return true
  }
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

async function checkApiKey(ctx: Context, key: string) {
  const [apiKey] = await sql`
    select *,
    (select org_id from project where project.id = api_key.project_id) as org_id
    from api_key
    where api_key.api_key = ${key}`

  if (!apiKey) {
    // Support public key = project id
    const [project] =
      await sql`select id, org_id from project where id = ${key}`

    if (!project) {
      ctx.throw(401, "Invalid API key")
    }

    return { type: "public", projectId: project.id, orgId: project.orgId }
  } else {
    return apiKey
  }
}

export async function authMiddleware(ctx: Context, next: Next) {
  ctx.state.projectId = ctx.request?.query?.projectId as string

  const isPublicRoute = publicRoutes.some((route) =>
    typeof route === "string" ? route === ctx.path : route.test(ctx.path),
  )

  const bearer = ctx.request?.headers?.authorization?.split(" ")[1] as string
  const apiKey = ctx.request?.headers?.["x-api-key"] as string

  const key = bearer || apiKey

  // For routes like signup, login, etc
  if (isPublicRoute && !key) {
    await next()
    return
  }
  // Check if API key is valid
  // Support passing as bearer because legacy SDKs did that
  else if (validateUUID(key)) {
    const { type, projectId, orgId } = await checkApiKey(ctx, key as string)

    ctx.state.projectId = projectId
    ctx.state.orgId = orgId

    if (type === "public" && !isPublicRoute) {
      ctx.throw(401, "This route requires a private API key")
    }

    if (type == "private") {
      ctx.state.privateKey = true
    }
  } else {
    // Check if JWT is valid
    try {
      if (!bearer) {
        throw new Error("No bearer token provided.")
      }
      const { payload } = await verifyJWT<SessionData>(key)

      ctx.state.userId = payload.userId
      ctx.state.orgId = payload.orgId

      const [user] =
        await sql`select * from account where id = ${ctx.state.userId}`
      if (!user) {
        ctx.throw(401, "This account no longer exists")
      }

      if (ctx.state.projectId) {
        // Check if user has access to project

        const [project] = await sql`
          select * from account_project where account_id = ${ctx.state.userId} and project_id = ${ctx.state.projectId}
        `

        if (!project) {
          throw new Error("Project not found")
        }
      }
    } catch (error) {
      console.error(error)
      ctx.throw(401, "Invalid access token")
    }
  }

  await next()
}

export async function requestPasswordReset(email: string) {
  const [user] = await sql`select id from account where email = ${email}`

  const ONE_HOUR = 60 * 60
  const token = await signJWT({ email }, ONE_HOUR)

  await sql`update account set recovery_token = ${token} where id = ${user.id}`

  const link = `${process.env.APP_URL}/reset-password?token=${token}`

  await sendEmail(RESET_PASSWORD(email, link))
}
