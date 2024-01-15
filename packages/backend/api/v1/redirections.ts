import { Context } from "koa"
import Router from "koa-router"

const redirections = new Router({
  prefix: "/",
})

redirections.post("api/report", async (ctx: Context) => {
  const projectId = ctx.request.body.events[0].projectId as string

  ctx.status = 308
  ctx.redirect(`/v1/runs/ingest?projectId=${projectId}`)
})

export default redirections
