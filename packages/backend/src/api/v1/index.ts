import sql from "@/src/utils/db"
import Router from "koa-router"

import datasets from "./datasets"
import orgs from "./orgs"

import checklists from "./checklists"
import evaluations from "./evaluations"
import projectUsers from "./external-users"
import filters from "./filters"
import projects from "./projects"
import radars from "./radars"
import runs from "./runs/index"
import templateVersions from "./template-versions"
import templates from "./templates"
import users from "./users"
import evaluators from "./evaluator"
import analytics from "./analytics"

const v1 = new Router({
  prefix: "/v1",
})

v1.get("/", async (ctx) => {
  ctx.body = "Lunary API v1"
})

v1.get("/health", async (ctx) => {
  const [res] = await sql`select 1`

  if (!res) {
    ctx.throw(500, "Cound't reach the db")
  }
  ctx.body = { status: "OK" }
})

v1.use(orgs.routes())
v1.use(users.routes())
v1.use(projects.routes())
v1.use(runs.routes())
v1.use(evaluators.routes())
v1.use(datasets.routes())
v1.use(radars.routes())
v1.use(templates.routes())
v1.use(templateVersions.routes())
v1.use(filters.routes())
v1.use(evaluations.routes())
v1.use(projectUsers.routes())
v1.use(checklists.routes())
v1.use(analytics.routes())

export default v1
