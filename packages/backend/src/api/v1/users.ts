import Router from "koa-router"
import { Context } from "koa"
import sql from "@/src/utils/db"
import { WELCOME_EMAIL, sendVerifyEmail } from "@/src/utils/emails"
import { jwtVerify } from "jose"
import { z } from "zod"
import { sendEmail } from "@/src/utils/sendEmail"

const users = new Router({
  prefix: "/users",
})

users.get("/me/org", async (ctx: Context) => {
  const { userId } = ctx.state

  // TODO: (low priority) merge queries
  const [org] = await sql`
      select * from org where id = (select org_id from account where id = ${userId})
    `

  if (!org) {
    ctx.status = 401
    ctx.body = { message: "Unauthorized" }
    return
  }

  const users = await sql`
      select
        id,
        name,
        email,
        role
      from
        account
      where
        org_id = ${org.id}
      order by
        role,
        name
    `

  org.users = users

  ctx.body = org
})

users.get("/me", async (ctx: Context) => {
  const { userId } = ctx.state

  const [user] = await sql`
      select
        id,
        name,
        email,
        verified
      from
        account
      where
        id = ${userId}
    `

  ctx.body = user
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
      select verified
      from account
      where email = ${email}
    `
    verified = result[0]?.verified
  }

  if (verified) {
    ctx.body = { message: "Email already verified" }
    return
  }

  const [acc] = await sql`
      update account
      set verified = true
      where email = ${email}
      returning org_id, name
    `
  const { orgId, name } = acc

  const [project] = await sql`
      SELECT id
      FROM project
      WHERE org_id = ${orgId}
    `
  const id = project?.id

  await sendEmail(WELCOME_EMAIL(email, name, id))
  // redirect to home page
  ctx.redirect(process.env.NEXT_PUBLIC_APP_URL!)
})

users.post("/send-verification", async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email(),
    name: z.string(),
  })
  const { email, name } = bodySchema.parse(ctx.request.body)

  await sendVerifyEmail(email, name)

  ctx.body = { ok: true }
})

users.get("/:userId", async (ctx: Context) => {
  const { userId } = ctx.params
  const { orgId } = ctx.state

  const [user] = await sql`
      select
        id,
        name,
        email,
        verified
      from
        account
      where
        id = ${userId} and org_id = ${orgId}`

  ctx.body = user
})

users.patch("/:userId", async (ctx: Context) => {
  const { userId: userToDeleteId } = ctx.params
  const { userId: currentUserId } = ctx.state

  const [currentUser] =
    await sql`select * from account where id = ${currentUserId}`

  const [userToDelete] =
    await sql`select * from account where id = ${userToDeleteId}`

  if (!["owner", "admin"].includes(currentUser.role)) {
    ctx.throw(
      401,
      "You must be an owner or an admin to remove a user from your team",
    )
  }

  if (currentUser.orgId !== userToDelete.orgId) {
    ctx.throw(401, "Forbidden")
  }

  // we remove the user from the org but don't delete it because later users will be able to be in several orgs
  await sql`update account set org_id = NULL where id = ${userToDeleteId}`

  ctx.status = 200
  ctx.body = {}
})

export default users
