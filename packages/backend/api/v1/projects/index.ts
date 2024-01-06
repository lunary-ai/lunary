import Router from "@koa/router"
import datasets from "./datasets"
import runs from "./runs"
import users from "./users"
import templates from "./templates"
import templateVersions from "./templateVersions"
import filters from "./filters"
import evals from "./evals"

const project = new Router({
  prefix: "/projects/:projectId",
})

project.use(runs.routes())
project.use(users.routes())
project.use(datasets.routes())
project.use(templates.routes())
project.use(templateVersions.routes())
project.use(filters.routes())
project.use(evals.routes())

export default project
