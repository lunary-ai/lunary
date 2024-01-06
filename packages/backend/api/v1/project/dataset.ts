import Router from "@koa/router"

const dataset = new Router()

dataset.get("/:id", async (ctx) => {
  // get dataset by id
})

export default dataset
