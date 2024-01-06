import Router from "@koa/router"
import dataset from "./dataset"
import logs from "./logs"
import users from "./users"

const project = new Router({
  prefix: "/project/:projectId",
})

project.use(users.routes())
project.use(dataset.routes())
project.use(logs.routes())

export default project
