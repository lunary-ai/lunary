import Router from "@koa/router"
import dataset from "./dataset"
import logs from "./logs"
import users from "./users"

const project = new Router({
  prefix: "/:projectId",
})

project.use(dataset.routes())
project.use(logs.routes())
project.use(users.routes())

export default project
