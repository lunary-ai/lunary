import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import Router from "koa-router"

const analytics = new Router({
  prefix: "/analytics",
})

analytics.get("/tokens", async (ctx: Context) => {})
analytics.get("/tokens", async (ctx: Context) => {})

analytics.get("/cost", async (ctx) => {
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

analytics.get("/users/cost", async (ctx: Context) => {})

analytics.get("/errors", async (ctx: Context) => {})

analytics.get("/latency", async (ctx: Context) => {})

analytics.get("/feedback/positive", async (ctx: Context) => {})

analytics.get("/feedback/negative", async (ctx: Context) => {})

export default analytics
