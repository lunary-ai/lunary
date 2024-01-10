import Router from "koa-router"
import { Context } from "koa"
import sql from "@/utils/db"

const users = new Router({
  prefix: "/users",
})

// router.get("/profile", verifySession(), async (ctx: SessionContext) => {
users.get("/me", async (ctx: Context) => {
  const userId = ctx.session!.getUserId()

  const [user] = await sql`
      select
        id,
        name,
        email,
        verified
      from
        profile
      where
        id = ${userId}
    `

  ctx.body = user
})

users.get("/me/org", async (ctx: Context) => {
  const userId = ctx.session!.getUserId()

  // TODO: (low priority) merge queries
  const [org] = await sql`
      select
        id,
        limited,
        name,
        plan,
        plan_period,
        canceled,
        play_allowance,
        stripe_customer,
        api_key
      from
        org
      where
        id = (select org_id from profile where id = ${userId})
    `

  const users = await sql`
      select
        id,
        name,
        email,
        role
      from
        profile
      where
        org_id = ${org.id}
      order by
        case role
          when 'admin' then 1
          when 'member' then 2
          else 3
        end,
        name
    `

  org.users = users

  ctx.body = org
})

export default users
