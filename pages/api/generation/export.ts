import { ensureHasAccessToApp } from "@/lib/api/ensureAppIsLogged"

import { apiWrapper } from "@/lib/api/helpers"
import { Parser } from "@json2csv/plainjs"
import { NextApiRequest, NextApiResponse } from "next"
import postgres from "postgres"

export const config = {
  api: {
    responseLimit: "100mb",
  },
}

const sql = postgres(process.env.DB_URI)

export default apiWrapper(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await ensureHasAccessToApp(req, res)
  // TODO: server side protection for free plan users

  let { appId, search, models, tags } = req.query
  if (models! instanceof Array || tags instanceof Array) {
    return res.status(422).json({
      error: 'Invalid input: "models" and "tags" must be of type Array.',
    })
  }

  models = models?.split(",") || []
  tags = tags?.split(",") || []

  let searchFilter = sql``
  if (search) {
    searchFilter = sql`and (
      r.input::text ilike ${"%" + search + "%"}
      or r.output::text ilike ${"%" + search + "%"}
      or r.error::text ilike ${"%" + search + "%"}
    )`
  }

  let modelsFilter = sql``
  if (models.length > 0) {
    modelsFilter = sql`and r.name =  any(${models})`
  }

  let tagsFilter = sql``
  if (tags.length > 0) {
    tagsFilter = sql`and r.tags && ${tags}`
  }

  // TODO: app users
  // TODO: cost
  const rows = await sql`
    select
      r.created_at as time,
      r.name as model,
      case 
        when r.ended_at is not null then extract(epoch from (r.ended_at - r.created_at)) 
        else null 
      end as duration,
      coalesce(completion_tokens, 0) + coalesce(prompt_tokens, 0) as tokens,
      tags as tags,
      input as prompt,
      coalesce(output, error) as result
    from
      run r 
    where
      r.app = ${appId}
      and r.type = 'llm'
      ${modelsFilter}
      ${tagsFilter}
      ${searchFilter}
    order by
      r.created_at desc;
  `

  const data = rows.length > 0 ? rows : [{}]
  const parser = new Parser()
  const csv = parser.parse(data)
  const buffer = Buffer.from(csv, "utf-8")

  const FIVE_MB = 3.5 * 1024 * 1024

  // TODO: file a way to send all the rows
  if (buffer.length > FIVE_MB) {
    console.log("slice")
    const slicedBuffer = buffer.slice(0, FIVE_MB)
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", "attachment; filename=out.csv")
    res.status(200).send(slicedBuffer)
  } else {
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", "attachment; filename=out.csv")
    res.status(200).send(buffer)
  }
})
