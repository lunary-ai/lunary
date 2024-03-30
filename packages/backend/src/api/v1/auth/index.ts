import sql from "@/src/utils/db"
import { sendVerifyEmail } from "@/src/utils/emails"
import Context from "@/src/utils/koa"
import { sendTelegramMessage } from "@/src/utils/notifications"
import Router from "koa-router"
import { z } from "zod"
import {
  hashPassword,
  requestPasswordReset,
  sanitizeEmail,
  signJwt,
  verifyJwt,
  verifyPassword,
} from "./utils"
import saml, { getLoginUrl } from "./saml"

const auth = new Router({
  prefix: "/auth",
})

auth.post("/method", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
  })

  const { email } = bodySchema.parse(ctx.request.body)

  const [samlOrg] = await sql`
    select org.* from org
    join account on account.org_id = org.id
    where account.email = ${email}
    and org.saml_enabled = true
    and org.saml_idp_xml is not null
  `

  if (!samlOrg || !samlOrg.samlIdpXml) {
    ctx.body = { method: "password" }
  } else {
    const url = await getLoginUrl(samlOrg.id)

    ctx.body = { method: "saml", redirect: url }
  }
})

auth.post("/signup", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
    password: z.string().min(6).optional(), // optional if SAML flow
    name: z.string(),
    orgName: z.string().optional(),
    projectName: z.string().optional(),
    employeeCount: z.string().optional(),
    orgId: z.string().optional(),
    token: z.string().optional(),
    redirectUrl: z.string().optional(),
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
    redirectUrl,
    token,
  } = bodySchema.parse(ctx.request.body)

  // Spamming hotfix
  if (orgName?.includes("https://") || name.includes("http://")) {
    ctx.throw(403, "Bad request")
  }

  if (signupMethod === "signup") {
    const { user, org } = await sql.begin(async (sql) => {
      const plan = process.env.DEFAULT_PLAN || "free"

      const [existingUser] = await sql`
        select * from account where lower(email) = lower(${email})
      `

      if (!password) {
        ctx.throw(403, "Password is required")
      }

      if (existingUser) {
        ctx.throw(403, "User already exists")
      }

      const [org] =
        await sql`insert into org ${sql({ name: orgName || `${name}'s Org`, plan })} returning *`

      const newUser = {
        name,
        passwordHash: await hashPassword(password!),
        email,
        orgId: org.id,
        role: "owner",
        verified: !process.env.RESEND_KEY ? true : false,
        lastLoginAt: new Date(),
      }

      const [user] = await sql`
        insert into account ${sql(newUser)} 
        returning *
      `

      const newProject = {
        name: projectName,
        orgId: org.id,
      }
      const [project] = await sql`
        insert into project ${sql(newProject)} returning *
      `

      await sql`
        insert into account_project ${sql({ accountId: user.id, projectId: project.id })}
      `

      const publicKey = {
        type: "public",
        projectId: project.id,
        apiKey: project.id,
      }
      await sql`
        insert into api_key ${sql(publicKey)}
      `
      const privateKey = [
        {
          type: "private",
          projectId: project.id,
        },
      ]
      await sql`
        insert into api_key ${sql(privateKey)}
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
    const { payload } = await verifyJwt(token!)

    if (payload.email !== email) {
      ctx.throw(403, "Invalid token")
    }

    const update = {
      name,
      verified: true,
      singleUseToken: null,
    }

    if (password) {
      update.passwordHash = await hashPassword(password)
    }

    await sql`
        update account set ${sql(update)}
        where email = ${email} and org_id = ${orgId!}
        returning *
     `

    ctx.body = {}
    return
  }
})

auth.get("/join-data", async (ctx: Context) => {
  const token = z.string().parse(ctx.query.token)

  const {
    payload: { orgId },
  } = await verifyJwt(token)

  const [org] = await sql`
    select name, plan from org where id = ${orgId}
  `

  const [orgUserCountResult] = await sql`
    select count(*) from account where org_id = ${orgId}
  `
  const orgUserCount = parseInt(orgUserCountResult.count, 10)

  ctx.body = {
    orgUserCount,
    orgName: org?.name,
    orgPlan: org?.plan,
    orgId: orgId,
  }
})

auth.post("/login", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
    password: z.string(),
  })

  const body = bodySchema.safeParse(ctx.request.body)
  if (!body.success) {
    ctx.status = 402
    ctx.body = {
      error: "Unauthorized",
      message: "Email must be of valid format, and password must be a string",
    }
    return
  }

  const { email, password } = body.data

  const [user] = await sql`
    select * from account where email = ${email}
  `
  if (!user) {
    ctx.body = ctx.throw(403, "Invalid email or password")
  }

  if (!user.passwordHash) {
    await requestPasswordReset(email)

    ctx.body = { message: "We sent you an email to reset your password" }
    return
  }

  const passwordCorrect = await verifyPassword(password, user.passwordHash)

  if (!passwordCorrect) {
    ctx.status = 403
    ctx.body = { error: "Unauthorized", message: "Invalid email or password" }
    return
  }

  // update last login
  await sql`update account set last_login_at = now() where id = ${user.id}`

  const token = await signJwt({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
  })

  ctx.body = { token }
})

auth.post("/request-password-reset", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email().transform(sanitizeEmail),
  })

  try {
    const body = bodySchema.safeParse(ctx.request.body)
    if (!body.success) {
      ctx.status = 400
      ctx.body = { error: "Invalid email format" }
      return
    }

    const { email } = body.data

    await requestPasswordReset(email)

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
    update account set password_hash = ${passwordHash}, last_login_at = NOW() where email = ${email} returning *
  `

  const authToken = await signJwt({
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
  })

  ctx.body = { token: authToken }
})

// Used after the SAML flow to exchange the onetime token for an auth token
auth.post("/exchange-token", async (ctx: Context) => {
  const { onetimeToken } = ctx.request.body as { onetimeToken: string }

  await verifyJwt(onetimeToken)

  // get account with onetime_token = token
  const [account] = await sql`
    update account set single_use_token = null where single_use_token = ${onetimeToken} returning *
  `

  if (!account) {
    ctx.throw(401, "Invalid onetime token")
  }

  const oneDay = 60 * 60 * 24

  const authToken = await signJwt(
    {
      userId: account.id,
      email: account.email,
      orgId: account.orgId,
    },
    oneDay,
  )

  ctx.body = { token: authToken }
})

auth.use(saml.routes())

export default auth
