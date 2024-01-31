import sql from "@/src/utils/db"
import Router from "koa-router"

const evals = new Router({
  prefix: "/evals",
})

export default evals
