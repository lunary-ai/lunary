import { checkAccess, checkProjectAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { z } from "zod"

const projects = new Router({
  prefix: "/projects",
})

projects.get("/", checkAccess("projects", "read"), async (ctx: Context) => {
  const { orgId, userId } = ctx.state

  const rows = await sql`
    select
      id,
      created_at,
      name,
      org_id,
      exists(select * from run where project_id = project.id) as activated,
      (select api_key from api_key where project_id = project.id and type = 'public') as public_api_key,
      (select api_key from api_key where project_id = project.id and type = 'private') as private_api_key,
      (select array_agg(project_id) as id from account_project where account_id = ${userId}) as projects
    from
      project
      left join account_project on account_project.account_id = ${userId}
    where
      org_id = ${orgId}
      and project.id = account_project.project_id
  `

  ctx.body = rows
})

projects.post("/", checkAccess("projects", "create"), async (ctx: Context) => {
  const { orgId } = ctx.state

  const bodySchema = z.object({
    name: z.string(),
  })
  const { name } = bodySchema.parse(ctx.request.body)

  const [{ plan }] = await sql`select plan from org where id = ${orgId}`
  const [{ count }] =
    await sql`select count(*)::int from project where org_id = ${orgId}`

  if (plan === "free" && count >= 3) {
    ctx.throw(403, "You can't create more than 3 project under the free plan.")
  }

  const newProject = {
    name,
    orgId,
  }

  const [project] =
    await sql`insert into project ${sql(newProject)} returning *`

  await sql`
    insert into account_project (account_id, project_id)
    select account.id, ${project.id}
    from account
    where account.org_id = ${orgId} and (account.role = 'owner' or account.role = 'admin')
  `

  const publicKey = {
    type: "public",
    projectId: project.id,
    apiKey: project.id,
  }
  sql`insert into api_key ${sql(publicKey)}`

  const privateKey = [
    {
      type: "private",
      projectId: project.id,
    },
  ]
  await sql`insert into api_key ${sql(privateKey)}`
  ctx.body = project
})

projects.delete(
  "/:projectId",
  checkAccess("projects", "delete"),
  async (ctx: Context) => {
    const { projectId } = ctx.params
    const { orgId, userId } = ctx.state

    const hasProjectAccess = await checkProjectAccess(projectId, userId)
    const [user] = await sql`select * from account where id = ${userId}`

    if (!hasProjectAccess) {
      ctx.throw(401, "Not allowed")
    }

    const [{ count }] =
      await sql`select count(*)::int from  project where org_id = ${orgId}`

    if (count > 1) {
      await sql`delete from project where id = ${projectId}`
      ctx.status = 200
      ctx.body = {}
      return
    } else {
      ctx.status = 422

      ctx.body = {
        error: "Deletion Failed",
        message: "An organization must have at least one project.",
      }
      return
    }
  },
)

projects.patch(
  "/:projectId",
  checkAccess("projects", "update"),
  async (ctx: Context) => {
    const { projectId } = ctx.params
    const { userId } = ctx.state

    const hasProjectAccess = await checkProjectAccess(projectId, userId)
    if (!hasProjectAccess) {
      ctx.throw(401, "Unauthorized")
    }

    const bodySchema = z.object({
      name: z.string(),
    })
    const { name } = bodySchema.parse(ctx.request.body)

    await sql`
      update project
      set
        name = ${name}
      where
        id = ${projectId}
    `
    ctx.status = 200
    ctx.body = {}
  },
)

export default projects
