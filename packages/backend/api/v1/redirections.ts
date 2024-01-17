import { Context } from "koa"
import Router from "koa-router"

const redirections = new Router()

redirections.post("/api/report", async (ctx: Context) => {
  const { body } = ctx.request
  const event = body?.events[0]
  ctx.state.projectId = event?.projectId || event.app

  ctx.status = 308
  ctx.redirect(`/v1/runs/ingest`)
})

export default redirections
