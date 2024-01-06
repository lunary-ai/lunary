import sql from "@/utils/db"
import Router from "@koa/router"
import { Context } from "koa"

const evals = new Router({
  prefix: "/evals",
})

export default evals
