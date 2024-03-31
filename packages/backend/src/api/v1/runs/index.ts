import sql from "@/src/utils/db"
import { Context } from "koa"
import Router from "koa-router"

import ingest from "./ingest"
import { fileExport } from "./export"
import { deserializeLogic } from "shared"
import { convertChecksToSQL } from "@/src/utils/checks"
import { checkAccess } from "@/src/utils/authorization"
import { jsonrepair } from "jsonrepair"

const runs = new Router({
  prefix: "/runs",
})

interface Query {
  type?: "llm" | "trace" | "thread"
  search?: string
  models?: string[]
  tags?: string[]
  tokens?: string
  exportType?: "csv" | "jsonl"
  minDuration?: string
  maxDuration?: string
  startTime?: string
  endTime?: string
  parentRunId?: string
  limit?: string
  page?: string
  order?: string
}

function processInput(input: unknown) {
  if (
    input &&
    typeof input === "object" &&
    Object.keys(input).length === 1 &&
    input.hasOwnProperty("input")
  ) {
    return input.input
  }

  return input
}

function processOutput(output: unknown) {
  if (
    output &&
    typeof output === "object" &&
    Object.keys(output).length === 1 &&
    output.hasOwnProperty("output")
  ) {
    return output.output
  }

  return output
}

function processParams(params: any) {
  if (!params) return {}
  try {
    // handles tools received as string (eg. litellm)
    if (params.tools && typeof params.tools === "string") {
      params.tools = JSON.parse(jsonrepair(params.tools))
    }
  } catch (e) {
    console.error(e)
    console.error("Error parsing tools")
  }
  return params
}

const formatRun = (run: any) => ({
  id: run.id,
  isPublic: run.isPublic,
  feedback: run.feedback,
  parentFeedback: run.parentFeedback,

  type: run.type,
  name: run.name,
  createdAt: run.createdAt,
  endedAt: run.endedAt,
  duration: run.duration,
  templateVersionId: run.templateVersionId,
  cost: run.cost,
  tokens: {
    completion: run.completionTokens,
    prompt: run.promptTokens,
    total: run.completionTokens + run.promptTokens,
  },
  tags: run.tags,
  input: processInput(run.input),
  output: processOutput(run.output),
  error: run.error,
  status: run.status,
  siblingRunId: run.siblingRunId,
  params: processParams(run.params),

  metadata: run.metadata,
  user: {
    id: run.externalUserId,
    externalId: run.userExternalId,
    createdAt: run.userCreatedAt,
    lastSeen: run.userLastSeen,
    props: run.userProps,
  },
})

runs.use("/ingest", ingest.routes())

runs.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state

  const queryString = ctx.querystring
  const deserializedChecks = deserializeLogic(queryString)

  const filtersQuery =
    deserializedChecks?.length && deserializedChecks.length > 1 // first is always ["AND"]
      ? convertChecksToSQL(deserializedChecks)
      : sql`type = 'llm'` // default to type llm

  const {
    limit = "50",
    page = "0",
    parentRunId,
    exportType,
  } = ctx.query as Query

  let parentRunCheck = sql``
  if (parentRunId) {
    parentRunCheck = sql`and parent_run_id = ${parentRunId}`
  }

  const rows = await sql`
      select
        r.*,
        eu.id as user_id,
        eu.external_id as user_external_id,
        eu.created_at as user_created_at,
        eu.last_seen as user_last_seen,
        eu.props as user_props,
        rpfc.feedback as parent_feedback
      from
          run r
          left join external_user eu on r.external_user_id = eu.id
          left join run_parent_feedback_cache rpfc ON r.id = rpfc.id
      where
          r.project_id = ${projectId}
          ${parentRunCheck}
          and (${filtersQuery})
      order by
          r.created_at desc
      limit ${Number(limit)}
      offset ${Number(page) * Number(limit)}`

  const runs = rows.map(formatRun)

  if (exportType) {
    return fileExport(runs, exportType, ctx)
  }

  ctx.body = runs
})

runs.get("/usage", checkAccess("logs", "read"), async (ctx) => {
  const { projectId } = ctx.state
  const { days, userId, daily } = ctx.query as {
    days: string
    userId: string
    daily: string
  }

  const daysNum = parseInt(days)
  const userIdNum = userId ? parseInt(userId) : null

  if (isNaN(daysNum) || (userId && isNaN(userIdNum))) {
    ctx.throw(400, "Invalid query parameters")
  }

  // TODO: probably cleaner to split this into two routes
  const runsUsage = await sql`
      select
          ${daily ? sql`date(run.created_at) as date,` : sql``}
          run.name,
          run.type,
          coalesce(sum(run.completion_tokens), 0)::int as completion_tokens,
          coalesce(sum(run.prompt_tokens), 0)::int as prompt_tokens,
          coalesce(sum(run.cost), 0)::float as cost,
          sum(case when run.status = 'error' then 1 else 0 end)::int as errors,
          sum(case when run.status = 'success' then 1 else 0 end)::int as success
      from
          run
      where
          run.project_id = ${projectId as string}
          and run.created_at >= now() - interval '1 day' * ${daysNum}
          ${userIdNum ? sql`and run.external_user_id = ${userIdNum}` : sql``}
          ${
            daily
              ? sql`and extract(epoch FROM (ended_at - created_at)) * 1000 >= 1000`
              : sql``
          }
      group by
          ${daily ? sql`date,` : sql``}
          run.name, 
          run.type
          `

  ctx.body = runsUsage
})

runs.get("/:id/public", async (ctx) => {
  const { id } = ctx.params

  const [row] = await sql`
      select
        r.*,
        eu.id as user_id,
        eu.external_id as user_external_id,
        eu.created_at as user_created_at,
        eu.last_seen as user_last_seen,
        eu.props as user_props
      from
          run r
          left join external_user eu on r.external_user_id = eu.id
      where
          r.id = ${id}
          and r.is_public = true
      order by
          r.created_at desc
      limit 1`

  if (!row) throw new Error("Run not found. It might not be public.")

  ctx.body = formatRun(row)
})

runs.get("/:id", async (ctx) => {
  const { id } = ctx.params

  // Use orgId in case teammates shares URL to run and teammates is on another project.
  const { orgId } = ctx.state

  const [row] = await sql`
      select
        r.*,
        eu.id as user_id,
        eu.external_id as user_external_id,
        eu.created_at as user_created_at,
        eu.last_seen as user_last_seen,
        eu.props as user_props
      from
          run r
          left join external_user eu on r.external_user_id = eu.id
      where
          r.project_id in (select id from project where org_id = ${orgId})
          and r.id = ${id}
      order by
          r.created_at desc
      limit 1`

  ctx.body = formatRun(row)
})

runs.patch("/:id", checkAccess("logs", "update"), async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params
  const { isPublic, feedback, tags } = ctx.request.body as {
    isPublic: boolean
    feedback: string
    tags: string[]
  }

  await sql`
      update
          run
      set
          is_public = ${isPublic},
          feedback = ${feedback},
          tags = ${tags}
      where
          project_id= ${projectId as string}
          and id = ${id}`

  ctx.status = 200
})

runs.get("/:id/related", checkAccess("logs", "read"), async (ctx) => {
  const id = ctx.params.id

  const related = await sql`
    WITH RECURSIVE related_runs AS (
      SELECT r1.*
      FROM run r1
      WHERE r1.id = ${id}

      UNION ALL
      SELECT r2.*
      FROM run r2
      INNER JOIN related_runs rr ON rr.id = r2.parent_run_id
  )
  SELECT rr.created_at, rr.tags, rr.project_id, rr.id, rr.status, rr.name, rr.ended_at, rr.error, rr.input, rr.output, 
        rr.params, rr.type, rr.parent_run_id, rr.completion_tokens, rr.prompt_tokens, rr.feedback
  FROM related_runs rr;
  `

  ctx.body = related
})

// public route
runs.get("/:id/feedback", async (ctx) => {
  const { projectId } = ctx.state
  const { id } = ctx.params

  const [row] = await sql`
      select
          feedback
      from
          run
      where
          project_id = ${projectId} and id = ${id}
      limit 1`

  if (!row) {
    ctx.throw(404, "Run not found")
  }

  ctx.body = row.feedback
})

export default runs
