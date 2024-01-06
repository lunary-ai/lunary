import Router from "@koa/router"
import dataset from "./dataset"

const project = new Router({
  prefix: "/:projectId",
})

project.get("/", async (ctx) => {
  // get project by id
})

project.use("/dataset", dataset.routes(), dataset.allowedMethods())

export default project
