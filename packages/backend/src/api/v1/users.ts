import Router from "koa-router"
import { Context } from "koa"
import sql from "@/src/utils/db"
import {
  INVITE_EMAIL,
  WELCOME_EMAIL,
  sendVerifyEmail,
} from "@/src/utils/emails"
import { jwtVerify } from "jose"
import { z } from "zod"
import { sendEmail } from "@/src/utils/sendEmail"
import { signJWT } from "./auth/utils"
import { roles } from "shared"
import { checkAccess } from "@/src/utils/authorization"

const users = new Router({
  prefix: "/users",
})

users.get("/me/org", async (ctx: Context) => {
  const { userId } = ctx.state

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
        account.id,
        account.created_at,
        account.email,
        account.org_id,
        account.role,
        account.verified,
        account.avatar_url,
        account.last_login_at,
        array_agg(account_project.project_id) as projects
      from
        account
        left join account_project on account.id = account_project.account_id
      where
        account.org_id = ${org.id}
      group by
        account.id
      order by
        account.role,
        account.name
    `

  org.users = users
  org.license = ctx.state.license
  ctx.body = org
})

users.get("/me", async (ctx: Context) => {
  const { userId } = ctx.state

  const [user] = await sql`
      select
        account.id,
        account.created_at,
        account.email,
        account.org_id,
        account.role,
        account.verified,
        account.avatar_url,
        account.last_login_at,
        array_agg(account_project.project_id) as projects
      from
        account
        left join account_project on account.id = account_project.account_id
      where
        id = ${userId}
      group by 
        account.id
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
  ctx.redirect(process.env.APP_URL!)
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

users.get(
  "/:userId",
  checkAccess("teamMembers", "read"),
  async (ctx: Context) => {
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
  },
)

users.post("/", checkAccess("teamMembers", "create"), async (ctx: Context) => {
  const bodySchema = z.object({
    email: z.string().email(),
    role: z.enum(Object.keys(roles) as [string, ...string[]]),
    projects: z.array(z.string()).min(1),
  })
  const { email, role, projects } = bodySchema.parse(ctx.request.body)
  const { orgId } = ctx.state

  const FIFTEEN_DAYS = 60 * 60 * 24 * 15

  const [org] = await sql`
    select name, plan from org where id = ${orgId}
  `

  const [orgUserCountResult] = await sql`
    select count(*) from account where org_id = ${orgId}
  `
  const orgUserCount = orgUserCountResult.count

  const token = await signJWT({ email, orgId }, FIFTEEN_DAYS)
  const userToInsert = {
    email,
    orgId,
    role,
    verified: false,
    singleUseToken: token,
  }

  const [existingUser] = await sql`
    select id from account where email = ${email}
  `
  if (existingUser) {
    ctx.throw(400, "User with this email already exists")
  }

  const [user] = await sql`insert into account ${sql(userToInsert)} returning *`

  for (const projectId of projects) {
    await sql`
      insert into account_project (account_id, project_id) values (${user.id}, ${projectId}) returning *
    `
  }

  const [finalUser] = await sql`
    select 
      account.*, 
      array_agg(account_project.project_id) as project_ids 
    from account 
    left join account_project on account.id = account_project.account_id 
    where account.email = ${email} 
    group by account.id
  `

  if (!org.samlEnabled) {
    const link = `${process.env.APP_URL}/join?token=${token}`
    await sendEmail(INVITE_EMAIL(email, org.name, link))
  }

  ctx.status = 201
  ctx.body = { user: finalUser }
})

users.delete(
  "/:userId",
  checkAccess("teamMembers", "delete"),
  async (ctx: Context) => {
    const { userId: userToDeleteId } = ctx.params
    const { userId: currentUserId, orgId } = ctx.state

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

    await sql`delete from account where id = ${userToDeleteId}`

    ctx.status = 200
    ctx.body = {}
  },
)

users.patch(
  "/:userId",
  checkAccess("teamMembers", "update"),
  async (ctx: Context) => {
    const UpdateUserSchema = z.object({
      projects: z.array(z.string()).min(1),
      role: z.enum(Object.keys(roles) as [string, ...string[]]),
    })
    const { userId } = ctx.params
    const { userId: currentUserId, orgId } = ctx.state

    const { projects, role } = UpdateUserSchema.parse(ctx.request.body)

    const [{ plan }] =
      await sql`select plan, eval_allowance from org where id = ${orgId}`
    if (plan === "free" || plan === "pro") {
      ctx.throw(403, "You must be an enterprise customer to change a user role")
    }

    if (role === "owner") {
      ctx.throw(403, "You cannot modify the owner role")
    }
    const [currentUser] =
      await sql`select * from account where id = ${currentUserId}`
    if (!["owner", "admin"].includes(currentUser.role)) {
      ctx.throw(403, "You do not have permission to modify this user")
    }

    const [userToModify] = await sql`select * from account where id = ${userId}`
    if (!userToModify || userToModify.org_id !== currentUser.org_id) {
      ctx.throw(404, "User not found in your organization")
    }
    if (userToModify.role === "owner") {
      ctx.throw(403, "You cannot modify the owner role")
    }

    await sql`update account set role = ${role} where id = ${userId}`

    // Get existing project IDs for the user
    const existingProjects = await sql`
 select project_id from account_project where account_id = ${userId}
`

    const existingProjectIds = existingProjects.map((row) => row.projectId)

    const projectsToDelete = existingProjectIds.filter(
      (projectId) => !projects.includes(projectId),
    )

    console.log(projectsToDelete)
    for (const projectId of projectsToDelete) {
      await sql`
   delete from account_project
   where account_id = ${userId} and project_id = ${projectId}
 `
    }

    for (const projectId of projects) {
      await sql`
    insert into account_project (account_id, project_id)
    values (${userId}, ${projectId})
    on conflict (account_id, project_id)
    do nothing
   `
    }

    ctx.status = 200
    ctx.body = { message: "User updated successfully" }
  },
)
export default users
