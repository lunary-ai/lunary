import Router from "koa-router"
import { Context } from "koa"
import sql from "@/utils/db"
import { sendEmail } from "supertokens-node/recipe/emailpassword"
import { WELCOME_EMAIL } from "@/utils/emails"
import { jwtVerify } from "jose"

const users = new Router({
  prefix: "/users",
})

// router.get("/profile", verifySession(), async (ctx: SessionContext) => {
users.get("/me", async (ctx: Context) => {
  const userId = ctx.session!.getUserId()

  const [user] = await sql`
      select
        id,
        name,
        email,
        verified
      from
        profile
      where
        id = ${userId}
    `

  ctx.body = user
})

users.get("/me/org", async (ctx: Context) => {
  const userId = ctx.session!.getUserId()

  // TODO: (low priority) merge queries
  const [org] = await sql`
      select
        id,
        limited,
        name,
        plan,
        plan_period,
        canceled,
        play_allowance,
        stripe_customer,
        api_key
      from
        org
      where
        id = (select org_id from profile where id = ${userId})
    `

  const users = await sql`
      select
        id,
        name,
        email,
        role
      from
        profile
      where
        org_id = ${org.id}
      order by
        case role
          when 'admin' then 1
          when 'member' then 2
          else 3
        end,
        name
    `

  org.users = users

  ctx.body = org
})

users.get("/verify-email", async (ctx: Context) => {
  const token = ctx.request.query.token as string

  const {
    payload: { email },
  }: {
    payload: { email: string }
  } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))

  // check if email is already verified
  let verified
  {
    const result = await sql`
      SELECT verified
      FROM profile
      WHERE email = ${email}
    `
    verified = result[0]?.verified
  }

  if (verified) {
    ctx.body = { message: "Email already verified" }
    return
  }

  let org_id, name
  {
    const result = await sql`
      UPDATE profile
      SET verified = true
      WHERE email = ${email}
      RETURNING org_id, name
    `
    org_id = result[0]?.org_id
    name = result[0]?.name
  }

  let id
  {
    const result = await sql`
      SELECT id
      FROM app
      WHERE org_id = ${org_id}
    `
    id = result[0]?.id
  }

  await sendEmail(WELCOME_EMAIL(email, name, id))
})

export default users
