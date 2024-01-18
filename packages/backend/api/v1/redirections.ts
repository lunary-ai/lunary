import { Context } from "koa"
import Router from "koa-router"

const redirections = new Router()

redirections.post("/api/report", async (ctx: Context) => {
  const { body } = ctx.request
  const event = body?.events[0]
  const projectId = event?.projectId || event.app

  ctx.status = 308
  ctx.redirect(`/v1/runs/ingest?projectId=${projectId}`)
})

export default redirections
