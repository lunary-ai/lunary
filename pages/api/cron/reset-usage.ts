import { NextApiRequest, NextApiResponse } from "next"

import { apiWrapper } from "@/lib/api/helpers"
import { sendTelegramMessage } from "@/lib/notifications"

import postgres from "postgres"

const sql = postgres(process.env.DB_URI)

const updateLimitedStatus = async () => {
  // set limited = false for all users that have been under the limit
  // for the last 3 days
  const alreadyLimited = await sql`UPDATE "public"."profile" p
    SET limited = false 
    WHERE limited = true AND p.id NOT IN (
      SELECT p.id
      FROM "public"."profile" p
      JOIN "public"."app" a ON a.owner = p.id
      JOIN "public"."run" r ON r.app = a.id
      WHERE r.created_at >= CURRENT_DATE - INTERVAL '3 days'
      GROUP BY p.id
      HAVING COUNT(r.id) > 1000
    )
    RETURNING *;
  `

  // get all users with more than 1000 runs 2 out of the last 3 days
  // and set their `limited` to true
  const usersToLimit = await sql`WITH over_limit_days AS (
    SELECT 
      p.id,
      DATE(r.created_at) AS run_date,
      COUNT(r.id) AS daily_runs
    FROM "public"."profile" p
    JOIN "public"."app" a ON a.owner = p.id
    JOIN "public"."run" r ON r.app = a.id
    WHERE r.created_at >= CURRENT_DATE - INTERVAL '3 days'
    GROUP BY p.id, run_date
    HAVING COUNT(r.id) > 1000 AND p.plan = 'free'
),
over_limit_users AS (
    SELECT 
      id,
      COUNT(run_date) AS limit_exceeded_days
    FROM over_limit_days
    GROUP BY id
    HAVING COUNT(run_date) >= 2
)
UPDATE "public"."profile" 
SET limited = TRUE 
WHERE id IN (SELECT id FROM over_limit_users)
RETURNING *;`

  for (const user of usersToLimit) {
    // send telegram message to user
    if (alreadyLimited.find((u) => u.id === user.id)) continue

    await sendTelegramMessage(
      `⛔ limited ${user.email} because too many events`
    )
  }
}

// reset profile.ai_allowance:
// - 3 for free users
// - 10 for 'pro' users
// - 1000 for 'unlimited' and 'enterprise' users

const resetAIallowance = async () => {
  await sql`UPDATE "public"."profile" p SET ai_allowance = 3 WHERE p.plan = 'free';`

  await sql`UPDATE "public"."profile" p SET ai_allowance = 10 WHERE p.plan = 'pro';`

  await sql`UPDATE "public"."profile" p SET ai_allowance = 1000 WHERE p.plan = 'unlimited' OR p.plan = 'enterprise';`
}

export default apiWrapper(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const authHeader = req.headers["authorization"]

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" })
  }

  await resetAIallowance()

  await updateLimitedStatus()

  return res.status(200).json({ success: true })
})
