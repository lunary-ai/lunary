import { checkProjectAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { z } from "zod"

const projects = new Router({
  prefix: "/projects",
})

projects.get("/", async (ctx: Context) => {
  const { orgId } = ctx.state

  const rows = await sql`
    select
      id,
      created_at,
      name,
      org_id,
      exists(select * from run where project_id = project.id) as activated,
      (select api_key from api_key where project_id = project.id and type = 'public') as public_api_key,
      (select api_key from api_key where project_id = project.id and type = 'private') as private_api_key 
    from
      project
    where
      org_id = ${orgId}
  `

  ctx.body = rows
})

projects.post("/", async (ctx: Context) => {
  const { orgId } = ctx.state

  const bodySchema = z.object({
    name: z.string(),
  })
  const { name } = bodySchema.parse(ctx.request.body)

  const [org] = await sql`select * from org where id = ${orgId}`

  if (org.plan === "free") {
    ctx.throw(403, "You can't create more than 1 project under the free plan.")
  }

  const newProject = {
    name,
    orgId,
  }

  const [project] =
    await sql`insert into project ${sql(newProject)} returning *`

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

projects.delete("/:projectId", async (ctx: Context) => {
  const { projectId } = ctx.params
  const { orgId, userId } = ctx.state

  const hasProjectAccess = await checkProjectAccess(projectId, userId)
  const [user] = await sql`select * from account where id = ${userId}`

  if (!hasProjectAccess) {
    ctx.throw(401, "Not allowed")
  }

  if (user.role !== "admin") {
    ctx.throw(403, "You must be an admin to delete a project")
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
})

projects.patch("/:projectId", async (ctx: Context) => {
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
})

export default projects
