import sql from "@/utils/db"
import Router from "koa-router"

const radars = new Router({
  prefix: "/radars",
})

radars.get("/", async (ctx) => {
  console.log("radars")
  const { projectId } = ctx.state

  console.log("projectId", projectId)
  const rows = await sql`
    SELECT * FROM radar WHERE projectId = ${projectId}
  `
  ctx.body = rows
})

radars.post("/", async (ctx) => {
  const { projectId, userId } = ctx.state
  const { description, view, checks, alerts } = ctx.request.body as {
    description: string
    view: any[]
    checks: any[]
    alerts: any[]
  }

  const [row] = await sql`
    INSERT INTO radar ${sql({
      description,
      view: sql.json(view),
      checks: sql.json(checks),
      projectId,
      createdBy: userId,
    })}
    RETURNING *
  `
  ctx.body = row
})

radars.delete("/:radarId", async (ctx) => {
  const { projectId } = ctx.state
  const { radarId } = ctx.params

  const [row] = await sql`
    DELETE FROM radar
    WHERE id = ${radarId}
    AND projectId = ${projectId}
    RETURNING *
  `
  ctx.body = row
})

export default radars
