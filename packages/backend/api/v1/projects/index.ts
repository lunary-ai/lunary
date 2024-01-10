import Router from "koa-router"
import datasets from "./datasets"
import evals from "./evals"
import filters from "./filters"
import runs from "./runs"
import templateVersions from "./templateVersions"
import templates from "./templates"
import users from "./users"

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
