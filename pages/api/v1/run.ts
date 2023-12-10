import { Ratelimit } from "@upstash/ratelimit"
import { kv } from "@vercel/kv"
import { NextApiRequest, NextApiResponse } from "next"
import postgres from "postgres"
import { z } from "zod"
import { calcRunCost } from "@/utils/calcCosts"
import { apiWrapper } from "@/lib/api/helpers"

const sql = postgres(process.env.DB_URI, { transform: postgres.camel })

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, "1s"),
})

const querySchema = z
  .object({
    api_key: z.string().optional(),
    app_id: z.string(),
    search: z.string().optional(),
    models: z.union([z.string(), z.array(z.string())]).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    type: z
      .union([
        z.string(),
        z.array(
          z.enum(["llm", "tool", "chain", "agent", "thread", "chat", "embed"]),
        ),
      ])
      .optional(),
    limit: z.string().optional().default("100"),
    page: z.string().optional().default("0"),
    order: z.enum(["asc", "desc"]).optional(),
    min_duration: z.string().optional(),
    max_duration: z.string().optional(),
    start_time: z.string(),
    end_time: z.string(),
  })
  .transform((obj) => ({
    apiKey: obj.api_key,
    appId: obj.app_id,
    search: obj.search,
    models: Array.isArray(obj.models)
      ? obj.models
      : [obj.models].filter(Boolean),
    tags: Array.isArray(obj.tags) ? obj.tags : [obj.tags].filter(Boolean),
    type: Array.isArray(obj.type) ? obj.type : [obj.type].filter(Boolean),
    limit: Number(obj.limit),
    page: Number(obj.page),
    order: obj.order,
    minDuration: Number(obj.min_duration),
    maxDuration: Number(obj.max_duration),
    startTime: new Date(obj.start_time),
    endTime: new Date(obj.end_time),
  }))

export default apiWrapper(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const apiKey = (req.query.api_key ||
    req.headers["x-api-key"] ||
    req.cookies.api_key) as string

  const { success } = await ratelimit.limit(apiKey)

  if (!success) {
    console.error("Rate limit exceeded")
    return res.status(429).send("Rate limit exceeded")
  }

  const {
    appId,
    search,
    models,
    tags,
    type,
    limit,
    page,
    order,
    minDuration,
    maxDuration,
    startTime,
    endTime,
  } = querySchema.parse(req.query)

  if (!startTime || !endTime) {
    console.error("Missing startTime or endTime")
    return res.status(422).send("Missing startTime or endTime")
  }

  if (startTime >= endTime) {
    console.error("Invalid time window")
    return res.status(422).send("Invalid time window")
  }
  const timeWindowFilter = sql`and r.created_at between ${startTime} and ${endTime}`

  if (!appId) {
    console.error("Missing appId")
    return res.status(422).send("Missing appId")
  }

  const [org] = await sql`select * from org where api_key = ${apiKey}`
  const [app] = await sql`select * from app where id = ${appId}`

  if (org.id !== app.orgId || org.plan === "free") {
    console.error("Forbidden")
    return res
      .status(403)
      .send(
        "Forbidden. Please make sure you are using the correct API key and app ID, and that you are on a paid plan.",
      )
  }

  let typeFilter = sql``
  if (type?.length > 0) {
    typeFilter = sql`and r.type = any(${type})`
  }

  let searchFilter = sql``
  if (search) {
    searchFilter = sql`and (
        r.input::text ilike ${"%" + search + "%"}
        or r.output::text ilike ${"%" + search + "%"}
        or r.error::text ilike ${"%" + search + "%"}
      )`
  }

  let modelsFilter = sql``
  if (models?.length > 0) {
    modelsFilter = sql`and r.name =  any(${models})`
  }

  let tagsFilter = sql``
  if (tags?.length > 0) {
    tagsFilter = sql`and r.tags && ${tags}`
  }

  let durationFilter = sql``
  if (minDuration && maxDuration) {
    durationFilter = sql`and extract(epoch from (r.ended_at - r.created_at)) between ${minDuration} and ${maxDuration}`
  } else if (minDuration) {
    durationFilter = sql`and extract(epoch from (r.ended_at - r.created_at)) >= ${minDuration}`
  } else if (maxDuration) {
    durationFilter = sql`and extract(epoch from (r.ended_at - r.created_at)) <= ${maxDuration}`
  }

  const rows = await sql`
      select
        r.created_at,
        r.ended_at,
        case 
          when r.ended_at is not null then extract(epoch from (r.ended_at - r.created_at)) 
          else null 
        end as duration,
        r.type,
        r.name,
        coalesce(completion_tokens, 0) as completion_tokens, 
        coalesce(prompt_tokens, 0) as prompt_tokens,
        tags,
        input,
        output,
        error,
        au.external_id as user_id,
        au.created_at as user_created_at,
        au.last_seen as user_last_seen,
        au.props as user_props,
        coalesce(output, error) as output 
      from
        run r 
        left join app_user au on au.id = r.user 
      where
        r.app = ${appId}
        ${typeFilter}
        ${modelsFilter}
        ${tagsFilter}
        ${searchFilter}
        ${durationFilter}
        ${timeWindowFilter}
      order by
        r.created_at ${order === "asc" ? sql`asc` : sql`desc`} 
      limit ${limit} 
      offset ${page * limit};`

  const [{ count }] = await sql`
      select count(*) from run r
      where
        r.app = ${appId}
        ${typeFilter}
        ${modelsFilter}
        ${tagsFilter}
        ${searchFilter}
        ${durationFilter}
        ${timeWindowFilter}
    `

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
    user: {
      id: run.userId,
      createdAt: run.userCreatedAt,
      lastSeen: run.userLastSeen,
      props: run.userProps,
    },
    cost: calcRunCost(run),
  }))

  return res.status(200).json({ data: runs, total: Number(count), page, limit })
})
