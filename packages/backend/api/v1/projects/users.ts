import sql from "@/utils/db"
import Router from "@koa/router"
import { Context } from "koa"

const users = new Router({
  prefix: "/users",
})

users.get("/", async (ctx: Context) => {
  const { projectId } = ctx.params
  const { limit, page } = ctx.query

  const users = await sql`
      with app_users as (
          select distinct on (external_id) id
          from app_user
          where app = ${projectId}
            and external_id is not null
      )
      select distinct on (u.external_id) u.*
      from app_user u
      where u.app = ${projectId}
        and u.external_id is not null
        and exists (
            select 1
            from run
            where run.user = u.id
            and run.type = 'llm'
        )`

  ctx.body = users
})

users.get("/:id", async (ctx: Context) => {
  const { id } = ctx.params
  const [row] = await sql`
    select * from app_user where id = ${id} limit 1
  `

  ctx.body = row
})

export default users
