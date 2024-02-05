import Router from "koa-router"
import sql from "@/src/utils/db"

import orgs from "./orgs"
import datasets from "./datasets"
evaluations
import filters from "./filters"
import runs from "./runs/index"
import templateVersions from "./templateVersions"
import templates from "./templates"
import users from "./users"
import projectUsers from "./external-users"
import projects from "./projects"
import radars from "./radars"
import evaluations from "./evaluations"

const v1 = new Router({
  prefix: "/v1",
})

v1.get("/", async (ctx) => {
  ctx.body = "Lunary API v1"
})

v1.get("/health", async (ctx) => {
  const [testUser] =
    await sql`select * from account where email = 'test@test.com'`

  if (!testUser) {
    ctx.throw(500, "No test user found")
  }
  ctx.body = "Ok"
})

v1.use(orgs.routes())
v1.use(users.routes())
v1.use(projects.routes())
v1.use(runs.routes())
v1.use(datasets.routes())
v1.use(radars.routes())
v1.use(templates.routes())
v1.use(templateVersions.routes())
v1.use(filters.routes())
v1.use(evaluations.routes())
v1.use(projectUsers.routes())

export default v1
