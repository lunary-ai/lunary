import Router from "@koa/router"
import project from "./project"
import org from "./org"

import users from "./users"

const v1 = new Router({
  prefix: "/v1",
})

v1.get("/", async (ctx) => {
  ctx.body = "Lunary API v1"
})

v1.use(org.routes())
v1.use(users.routes())
v1.use(project.routes())

export default v1
