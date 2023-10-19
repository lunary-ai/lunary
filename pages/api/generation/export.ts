import { NextApiRequest, NextApiResponse } from "next"
import postgres from "postgres"
import { Parser } from "@json2csv/plainjs"

const sql = postgres(process.env.DB_URI)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // TODO: server side protection for free plan users
  let { appId, search } = req.query

  let searchFilter = sql``
  if (search) {
    searchFilter = sql`and (
      r.input::text ilike ${"%" + search + "%"}
      or r.output::text ilike ${"%" + search + "%"}
      or r.error::text ilike ${"%" + search + "%"}
    )`
  }

  const rows = await sql`
  select
    *
  from
    run r 
  where
    app = ${appId}
    and type = 'llm'
    ${searchFilter}
  order by
    created_at desc;
  `

  const parser = new Parser()
  const csv = parser.parse(rows)

  res.setHeader("Content-Type", "text/csv")
  res.setHeader("Content-Disposition", "attachment; filename=out.csv")
  res.status(200).send(csv)
}
