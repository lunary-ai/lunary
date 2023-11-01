import { NextApiRequest, NextApiResponse } from "next"
import postgres from "postgres"
import { ensureAppIsLogged } from "@/lib/ensureAppIsLogged"

const sql = postgres(process.env.DB_URI)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await ensureAppIsLogged(req, res)

  const { appId } = req.body

  // Get number of runs each day in the last 30 days, even if 0

  const rows = await sql`
    select
      date_trunc('day', r.created_at) as date,
      count(*) as count
    from
      run r 
    where
      r.app = ${appId}
      and r.created_at > now() - interval '30 days'
    group by
      date
    order by
    date desc;
  `

  return res.status(200).json(rows)
}
