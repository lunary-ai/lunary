import sql from "@/utils/db"
import Context from "@/utils/koa"
import * as jose from "jose"
import { SignJWT } from "jose"
import { Next } from "koa"

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return Bun.password.verify(password, hash)
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
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
  "/v1/health",
  "/api/report", // required legacy route
  "/auth/user/password/reset",
  `/v1/runs/ingest`,
  `/v1/template_versions/latest`,
  "/v1/users/verify-email",
  "/v1/users/send-verification",
]
export async function authMiddleware(ctx: Context, next: Next) {
  try {
    ctx.state.projectId = ctx.request?.query?.projectId as string

    const isPublicRoute = publicRoutes.some((route) =>
      typeof route === "string" ? route === ctx.path : route.test(ctx.path),
    )

    if (isPublicRoute) {
      const bearerToken = ctx.request?.headers?.authorization?.split(" ")[1]
      if (typeof bearerToken === "string") {
        ctx.state.projectId = bearerToken
      }
      await next()
      return
    }

    const authHeader = ctx.request.headers.authorization
    if (!authHeader) {
      throw new Error("Authorization header is missing")
    }

    const token = authHeader.split(" ")[1]
    if (!token) {
      throw new Error("No bearer token provided")
    }
    const { payload } = await verifyJwt<SessionData>(token)

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
      message: "Invalid or expired token",
    }
    return
  }

  try {
    await next()
  } catch (error) {
    console.error(error)
  }
}
