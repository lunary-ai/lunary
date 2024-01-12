import Router from "koa-router"
import orgs from "./orgs"
import projects from "./projects"

import users from "./users"
import auth from "../auth"

const v1 = new Router({
  prefix: "/v1",
})

v1.get("/", async (ctx) => {
  ctx.body = "Lunary API v1"
})

v1.use(orgs.routes())
v1.use(users.routes())

export default v1
