import { Context } from "koa"
import Router from "koa-router"
import { verifySession } from "supertokens-node/recipe/session/framework/koa"

const redirections = new Router({
  prefix: "/",
})

redirections.post(
  "api/report",
  verifySession({ sessionRequired: false }),
  async (ctx: Context) => {
    const projectId = ctx.request.body.events[0].app as string

    ctx.status = 308
    ctx.redirect(`/v1/projects/${projectId}/runs/ingest`)
  },
)

export default redirections
