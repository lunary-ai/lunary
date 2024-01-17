import sql from "@/utils/db"
import { Context } from "koa"
import Router from "koa-router"

import ingest from "./ingest"
import { fileExport } from "./export"
import { deserializeLogic } from "shared"
import { convertFiltersToSQL } from "@/utils/filters"

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

const formatRun = (run: any) => ({
  id: run.id,
  isPublic: run.isPublic,
  feedback: run.feedback,
  type: run.type,
  name: run.name,
  createdAt: run.createdAt,
  endedAt: run.endedAt,
  duration: run.duration,
  templateVersionId: run.templateVersionId,
  tokens: {
    completion: run.completionTokens,
    prompt: run.promptTokens,
    total: run.completionTokens + run.promptTokens,
  },
  tags: run.tags,
  input: run.input,
  output: run.output,
  error: run.error,
  status: run.status,
  siblingRunId: run.siblingRunId,
  user: {
    id: run.externalUserId,
    externalId: run.userExternalId,
    createdAt: run.userCreatedAt,
    lastSeen: run.userLastSeen,
    props: run.userProps,
  },
})

runs.use("/ingest", ingest.routes())

runs.get("/", async (ctx) => {
  const { projectId } = ctx.state

  const queryString = ctx.querystring
  const deserializedFilters = deserializeLogic(queryString)
  const filtersQuery = deserializedFilters
    ? convertFiltersToSQL(deserializedFilters)
    : sql``

  const {
    search,
    limit = "100",
    page = "0",
    parentRunId,
    exportType,
  } = ctx.query as Query

  // let typeFilter = sql``
  // if (type === "llm") {
  //   typeFilter = sql`and type = 'llm'`
  // } else if (type === "trace") {
  //   typeFilter = sql`and type in ('agent','chain')`
  // } else if (type === "thread") {
  //   typeFilter = sql`and type in ('thread','convo')`
  // }

  let parentRunFilter = sql``
  if (parentRunId) {
    parentRunFilter = sql`and parent_run_id = ${parentRunId}`
  }

  // if (search) {
  //   queryFilters = sql`${queryFilters} and (r.input ilike ${
  //     "%" + search + "%"
  //   } or r.output ilike ${"%" + search + "%"})`;
  // }

  const rows = await sql`
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
          r.project_id = ${projectId}
          and ${filtersQuery}
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

runs.get("/usage", async (ctx) => {
  const { projectId } = ctx.state
  const { days, userId, daily } = ctx.query as {
    days: string
    userId: string
    daily: string
  }

  const daysNum = parseInt(days, 10)
  const userIdNum = userId ? parseInt(userId, 10) : null

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

runs.get("/:id", async (ctx) => {
  const { projectId } = ctx.state
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
          r.project_id = ${projectId as string}
          and r.id = ${id}
      order by
          r.created_at desc
      limit 1`

  ctx.body = formatRun(row)
})

runs.patch("/:id", async (ctx: Context) => {
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

  ctx.body = {}
})

runs.get("/:id/related", async (ctx) => {
  const related = await sql`
    WITH RECURSIVE related_runs AS (
      SELECT r1.*
      FROM run r1
      WHERE r1.id = ${ctx.params.id}

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

export default runs
