import { checkAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import Router from "koa-router"

const analytics = new Router({
  prefix: "/analytics",
})

analytics.get(
  "/tokens",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)
analytics.get(
  "/tokens",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

analytics.get("/cost", checkAccess("analytics", "read"), async (ctx) => {
  const { projectId } = ctx.state

  await sql`
    select
    eu.id,
    sum(run.cost) as cost
    from
      external_user eu
      left join run on run.external_user_id = eu.id
    where
      eu.project_id = ${projectId} 
    group by 
      eu.id
   `
})

analytics.get(
  "/users/cost",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

analytics.get(
  "/errors",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

analytics.get(
  "/latency",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

analytics.get(
  "/feedback/positive",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

analytics.get(
  "/feedback/negative",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

export default analytics
