import Router from "@koa/router"
import project from "./project"

const v1 = new Router({
  prefix: "/v1/",
})

v1.use(project.routes())

export default v1
