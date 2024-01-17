import sql from "@/utils/db"
import { RESET_PASSWORD, sendVerifyEmail } from "@/utils/emails"
import Context from "@/utils/koa"
import { sendTelegramMessage } from "@/utils/notifications"
import Router from "koa-router"
import { z } from "zod"
import { hashPassword, signJwt, verifyJwt, verifyPassword } from "./utils"
import { sendEmail } from "@/utils/sendEmail"

const auth = new Router({
  prefix: "/auth",
})

auth.post("/signup", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string(),
    orgName: z.string(),
    projectName: z.string(),
    employeeCount: z.string(),
    orgId: z.string().optional(),
    signupMethod: z.enum(["signup", "join"]),
  })

  const {
    email,
    password,
    name,
    orgName,
    projectName,
    employeeCount,
    orgId,
    signupMethod,
  } = bodySchema.parse(ctx.request.body)

  if (signupMethod === "signup") {
    const { user, org } = await sql.begin(async (sql) => {
      const [org] = await sql`
        insert into org (name, plan)
        values (${orgName || `${name}'s Org`}, 'free')
        returning *
      `

      const newUser = {
        name,
        passwordHash: await hashPassword(password),
        email,
        orgId: org.id,
        role: "admin",
        verified: process.env.SKIP_EMAIL_VERIFY ? true : false,
      }
      const [user] = await sql`
        insert into account ${sql(newUser)} 
        returning *
      `

      const newProject = {
        name: projectName,
        orgId: org.id,
      }
      await sql`
        insert into project ${sql(newProject)} 
      `

      return { user, org }
    })

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      orgId: org.id,
    })

    await sendVerifyEmail(email, name)
    await sendTelegramMessage(
      `<b>🔔 New signup from ${email}</b>
      ${name} is ${
        signupMethod === "signup"
          ? `building ${projectName} @ ${orgName} (${employeeCount}).`
          : "joining an org."
      }`,
      "users",
    )

    ctx.body = { token }
    return
  } else if (signupMethod === "join") {
    const newUser = {
      name,
      passwordHash: await hashPassword(password),
      email,
      orgId,
      role: "member",
      verified: true,
    }
    const [user] = await sql`insert into profile ${sql(newUser)} returning *`

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      orgId,
    })

    ctx.body = { token }
    return
  }
})

auth.post("/login", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email(),
    password: z.string(),
  })
  const { email, password } = bodySchema.parse(ctx.request.body)

  const [user] = await sql`
    select * from account where email = ${email}
  `
  if (!user) {
    ctx.status = 401
    ctx.body = { message: "Invalid email or password" }
  }

  const passwordCorrect = await verifyPassword(password, user.passwordHash)

  if (!passwordCorrect) {
    ctx.status = 401
    ctx.body = { message: "Invalid email or password" }
  }

  const token = await signJwt({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
  })

  ctx.body = { token }
})

auth.post("/request-password-reset", async (ctx: Context) => {
  try {
    const { email } = ctx.request.body as { email: string }
    const [user] = await sql`select id from account where email = ${email}`

    const ONE_HOUR = 60 * 60
    const token = await signJwt({ email }, ONE_HOUR)

    await sql`update account set recovery_token = ${token} where id = ${user.id}`

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

    sendEmail(RESET_PASSWORD(email, link))

    ctx.body = { ok: true }
  } catch (error) {
    console.error(error)
    // Do not send error message to client if email is not found
    ctx.body = {}
  }
})

auth.post("/reset-password", async (ctx: Context) => {
  const bodySchema = z.object({
    token: z.string(),
    password: z.string(),
  })
  const { token, password } = bodySchema.parse(ctx.request.body)

  const {
    payload: { email },
  } = await verifyJwt<{ email: string }>(token)

  const passwordHash = await hashPassword(password)

  const [user] = await sql`
    update account set password_hash = ${passwordHash} where email = ${email} returning *
  `

  const authToken = await signJwt({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
  })

  ctx.body = { token: authToken }
})

export default auth
