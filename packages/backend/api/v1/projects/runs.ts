import sql from "@/utils/db"
import Router from "koa-router"

const runs = new Router({
  prefix: "/runs",
})

interface Query {
  type?: "llm" | "trace" | "thread"
  search?: string
  models?: string[]
  tags?: string[]
  tokens?: string
  minDuration?: string
  maxDuration?: string
  startTime?: string
  endTime?: string

  limit?: string
  page?: string
  order?: string
}

runs.get("/", async (ctx) => {
  const projectId = ctx.params.projectId as string
  const {
    type,
    search,
    models = [],
    tags = [],
    limit = "100",
    page = "0",
    tokens,
    minDuration,
    maxDuration,
    startTime,
    endTime,
  } = ctx.query as Query

  if (!type) {
    return ctx.throw(422, "The `type` query parameter is required")
  }

  let typeFilter = sql``
  if (type === "llm") {
    typeFilter = sql`and type = 'llm'`
  } else if (type === "trace") {
    typeFilter = sql`and type in ('agent','chain')`
  } else if (type === "thread") {
    typeFilter = sql`and type in ('thread','convo')`
  }

  // if (
  //   !startTime ||
  //   !endTime ||
  //   new Date(startTime as string) >= new Date(endTime as string)
  // ) {
  //   ctx.throw(422, "Invalid time window");
  // }

  // await ensureHasAccessToApp(ctx);

  // if (models.length > 0) {
  //   queryFilters = sql`${queryFilters} and r.name = any(${models})`;
  // }
  // if (tags.length > 0) {
  //   queryFilters = sql`${queryFilters} and r.tags && ${tags}`;
  // }
  // if (search) {
  //   queryFilters = sql`${queryFilters} and (r.input ilike ${
  //     "%" + search + "%"
  //   } or r.output ilike ${"%" + search + "%"})`;
  // }
  // if (tokens) {
  //   queryFilters = sql`${queryFilters} and (r.completion_tokens + r.prompt_tokens) >= ${Number(
  //     tokens
  //   )}`;
  // }
  // if (minDuration && maxDuration) {
  //   queryFilters = sql`${queryFilters} and extract(epoch from (r.ended_at - r.created_at)) between ${Number(
  //     minDuration
  //   )} and ${Number(maxDuration)}`;
  // } else if (minDuration) {
  //   queryFilters = sql`${queryFilters} and extract(epoch from (r.ended_at - r.created_at)) >= ${Number(
  //     minDuration
  //   )}`;
  // } else if (maxDuration) {
  //   queryFilters = sql`${queryFilters} and extract(epoch from (r.ended_at - r.created_at)) <= ${Number(
  //     maxDuration
  //   )}`;
  // }
  // queryFilters = sql`${queryFilters} and r.created_at between ${new Date(
  //   startTime as string
  // )} and ${new Date(endTime as string)}`;

  const rows = await sql`
      select
        r.*,
        au.id as user_id,
        au.external_id as user_external_id,
        au.created_at as user_created_at,
        au.last_seen as user_last_seen,
        au.props as user_props
      from
          run r
          left join app_user au on r.user = au.id
      where
          r.app = ${projectId as string}
          ${typeFilter}
      order by
          r.created_at desc
      limit ${Number(limit)}
      offset ${Number(page) * Number(limit)}`

  const runs = rows.map((run) => ({
    type: run.type,
    name: run.name,
    createdAt: run.createdAt,
    endedAt: run.endedAt,
    duration: run.duration,
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
    user: {
      id: run.userId,
      externalId: run.userExternalId,
      createdAt: run.userCreatedAt,
      lastSeen: run.userLastSeen,
      props: run.userProps,
    },
    // TODO
    // cost: calcRunCost(run),
  }))

  ctx.body = runs
})

runs.get("/:id", async (ctx) => {
  const projectId = ctx.params.projectId as string
  const { id } = ctx.params

  const [row] = await sql`
      select
        r.*,
        au.id as user_id,
        au.external_id as user_external_id,
        au.created_at as user_created_at,
        au.last_seen as user_last_seen,
        au.props as user_props
      from
          run r
          left join app_user au on r.user = au.id
      where
          r.app = ${projectId as string}
          and r.id = ${id}
      order by
          r.created_at desc
      limit 1`

  const run = {
    type: row.type,
    name: row.name,
    createdAt: row.createdAt,
    endedAt: row.endedAt,
    duration: row.duration,
    tokens: {
      completion: row.completionTokens,
      prompt: row.promptTokens,
      total: row.completionTokens + row.promptTokens,
    },
    tags: row.tags,
    input: row.input,
    output: row.output,
    error: row.error,
    status: row.status,
    user: {
      id: row.userId,
      externalId: row.userExternalId,
      createdAt: row.userCreatedAt,
      lastSeen: row.userLastSeen,
      props: row.userProps,
    },
  }

  ctx.body = run
})

export default runs
