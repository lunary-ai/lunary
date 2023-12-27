import { NextApiRequest, NextApiResponse } from "next"
import { ensureIsLogged } from "@/lib/api/ensureAppIsLogged"
import { apiWrapper } from "@/lib/api/helpers"
import postgres from "postgres"

const sql = postgres(process.env.DB_URI!)

export default apiWrapper(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { supabase, session } = await ensureIsLogged(req, res)
  const { appId } = req.body

  let orgId = null

  if (!appId) {
    const {
      data: { org_id },
    } = await supabase
      .from("profile")
      .select("org_id")
      .eq("id", session?.user?.id)
      .single()
      .throwOnError()

    orgId = org_id
  }

  // If appId is not provided, we check for all apps in the org
  const rows = await sql`
    select
      date_trunc('day', r.created_at) as date,
      count(*) as count
    from
      run r 
    ${!appId ? sql`join app a on r.app = a.id` : sql``}
    where
      ${!appId ? sql`a.org_id = ${orgId} and` : sql``}
      ${appId ? sql`r.app = ${appId} and` : sql``}
      r.created_at > now() - interval '30 days'
    group by
      date
    order by
    date desc;
  `

  return res.status(200).json(rows)
})
