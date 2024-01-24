import sql from "@/utils/db"
import Router from "koa-router"

const radars = new Router({
  prefix: "/radars",
})

radars.get("/", async (ctx) => {
  const { projectId } = ctx.state

  const rows = await sql`
    SELECT r.*, 
      COUNT(rr.id) FILTER (WHERE rr.passed = true) AS passed,
      COUNT(rr.id) FILTER (WHERE rr.passed = false) AS failed
    FROM radar r
    LEFT JOIN radar_result rr ON rr.radar_id = r.id
    WHERE r.project_id = ${projectId}
    GROUP BY r.id
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
      // alerts: sql.json(alerts),
      projectId,
      ownerId: userId,
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
    AND project_id = ${projectId}
    RETURNING *
  `
  ctx.body = row
})

export default radars
