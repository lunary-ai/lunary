import Router from "@koa/router"
import projects from "./projects"
import orgs from "./orgs"

import users from "./users"

const v1 = new Router({
  prefix: "/v1",
})

v1.get("/", async (ctx) => {
  ctx.body = "Lunary API v1"
})

v1.use(orgs.routes())
v1.use(users.routes())
v1.use(projects.routes())

export default v1
