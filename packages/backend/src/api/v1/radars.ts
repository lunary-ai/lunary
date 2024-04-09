import { checkAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import Router from "koa-router"

const radars = new Router({
  prefix: "/radars",
})

const DEFAULT_RADARS = [
  {
    description: "Failed or slow LLM calls",
    negative: true,
    view: [
      "AND",
      {
        id: "type",
        params: {
          type: "llm",
        },
      },
    ],
    checks: [
      "OR",
      {
        id: "status",
        params: {
          status: "error",
        },
      },
      {
        id: "duration",
        params: {
          operator: "gt",
          duration: 30000,
        },
      },
    ],
  },
  {
    description:
      "Answer potentially contains PII (Personal Identifiable Information)",
    negative: true,
    view: [
      "AND",
      {
        id: "type",
        params: {
          type: "llm",
        },
      },
    ],
    checks: [
      "AND",
      {
        id: "pii",
        params: {
          field: "input",
          type: "contains",
          entities: ["person", "location", "email", "cc", "phone", "ssn"],
        },
      },
    ],
  },
  {
    description: "Prompt contains PII (Personal Identifiable Information)",
    negative: true,
    view: [
      "AND",
      {
        id: "type",
        params: {
          type: "llm",
        },
      },
    ],
    checks: [
      "AND",
      {
        id: "pii",
        params: {
          field: "input",
          type: "contains",
          entities: ["person", "location", "email", "cc", "phone", "ssn"],
        },
      },
    ],
  },
  {
    description: "Contains profanity or toxic language",
    negative: true,
    view: [
      "AND",
      {
        id: "type",
        params: {
          type: "llm",
        },
      },
    ],
    checks: [
      "OR",
      {
        id: "toxicity",
        params: {
          field: "any",
          type: "contains",
        },
      },
    ],
  },
  // {
  //   description: "Answers with negative sentiment",
  //   negative: true,
  //   view: [
  //     "AND",
  //     {
  //       id: "type",
  //       params: {
  //         type: "llm",
  //       },
  //     },
  //   ],
  //   checks: [
  //     "OR",
  //     {
  //       id: "sentiment",
  //       params: {
  //         field: "output",
  //         type: "contains",
  //         sentiment: "negative",
  //       },
  //     },
  //   ],
  // },
]

radars.get("/", async (ctx) => {
  const { projectId } = ctx.state

  const [hasRadar] = await sql`
    select 1 from radar where project_id = ${projectId}
  `

  if (!hasRadar) {
    await sql`
      insert into radar ${sql(
        DEFAULT_RADARS.map((radar) => ({
          ...radar,
          projectId,
        })),
      )}
    `
  }

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

radars.get("/:radarId", async (ctx) => {
  const { projectId } = ctx.state
  const { radarId } = ctx.params

  const [row] = await sql`
    SELECT r.*, 
      COUNT(rr.id) FILTER (WHERE rr.passed = true) AS passed,
      COUNT(rr.id) FILTER (WHERE rr.passed = false) AS failed
    FROM radar r
    LEFT JOIN radar_result rr ON rr.radar_id = r.id
    WHERE r.id = ${radarId} AND r.project_id = ${projectId}
    GROUP BY r.id
  `

  ctx.body = row
})

radars.get("/:radarId/chart", async (ctx) => {
  // get number of passing & failing runs for each day in the last 7 days
  // including days with no runs (passing and failing counts as 0)
  const { projectId } = ctx.state
  const { radarId } = ctx.params

  const rows = await sql`
    WITH date_series AS (
      SELECT generate_series(
        NOW() - INTERVAL '7 days',
        NOW(),
        '1 day'::interval
      )::date AS day
    )
    SELECT 
      ds.day,
      COALESCE(SUM(CASE WHEN rr.passed = true THEN 1 ELSE 0 END), 0) AS passed,
      COALESCE(SUM(CASE WHEN rr.passed = false THEN 1 ELSE 0 END), 0) AS failed
    FROM date_series ds
    LEFT JOIN (
      SELECT rr.*, r.created_at AS run_created_at FROM radar_result rr
      JOIN run r ON rr.run_id = r.id
      WHERE rr.radar_id = ${radarId} AND r.project_id = ${projectId}
    ) rr ON date_trunc('day', rr.run_created_at) = ds.day
    GROUP BY ds.day
    ORDER BY ds.day ASC
  `

  ctx.body = rows.map((row) => ({
    ...row,
    passed: Number(row.passed),
    failed: Number(row.failed),
  }))
})

radars.post("/", checkAccess("radars", "create"), async (ctx) => {
  const { projectId, userId, orgId } = ctx.state
  const { description, view, checks, alerts, negative } = ctx.request.body as {
    description: string
    view: any[]
    checks: any[]
    alerts: any[]
    negative: boolean
  }

  const [{ plan }] =
    await sql`select plan, eval_allowance from org where id = ${orgId}`
  if (plan === "free") {
    ctx.throw(403, "You can't create evaluations on the free plan.")
  }

  const [row] = await sql`
    insert into radar ${sql({
      description,
      view: sql.json(view),
      checks: sql.json(checks),
      // alerts: sql.json(alerts),
      negative,
      projectId,
      ownerId: userId,
    })}
    returning *
  `

  ctx.body = row
})

radars.patch("/:radarId", checkAccess("radars", "update"), async (ctx) => {
  const { projectId } = ctx.state
  const { radarId } = ctx.params

  const { description, view, checks, alerts, negative } = ctx.request.body as {
    description: string
    view: any[]
    checks: any[]
    alerts: any[]
    negative: boolean
  }

  const [row] = await sql`
    update radar
    set ${sql({
      description,
      view: sql.json(view),
      checks: sql.json(checks),
      negative,
      // alerts: sql.json(alerts),
    })}
      where id = ${radarId} and project_id = ${projectId}
      returning *
      `

  // if checks or view is modified, delete all radar results
  if (checks || view) {
    await sql`
      delete from radar_result where radar_id = ${row.id}
    `
  }

  ctx.body = row
})

radars.delete("/:radarId", checkAccess("radars", "delete"), async (ctx) => {
  const { projectId } = ctx.state
  const { radarId } = ctx.params

  const [row] = await sql`
    delete from radar
    where id = ${radarId}
    and project_id = ${projectId}
    returning *
  `
  ctx.body = row
})

export default radars
