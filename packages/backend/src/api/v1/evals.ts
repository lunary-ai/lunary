import sql from "@/src/utils/db"
import Router from "koa-router"

const evals = new Router({
  prefix: "/evals",
})

evals.get("/", async (ctx) => {
  ctx.body = {}
})

export default evals
