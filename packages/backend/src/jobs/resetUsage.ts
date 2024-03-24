import sql from "@/src/utils/db"
import { sendTelegramMessage } from "@/src/utils/notifications"

async function updateLimitedStatus() {
  // set limited = false for all users that have been under the limit
  // for the last 3 days
  const alreadyLimited = await sql`UPDATE "public"."org" p
  SET limited = false 
  WHERE limited = true AND p.id NOT IN (
    SELECT o.id
    FROM "public"."org" o
    JOIN "public"."project" p ON p.org_id = o.id
    JOIN "public"."run" r ON r.project_id = p.id
    WHERE r.created_at >= CURRENT_DATE - INTERVAL '3 days'
    GROUP BY o.id
    HAVING COUNT(r.id) > 1000
  )
  RETURNING *;
  `

  // get all users with more than 1000 runs 2 out of the last 3 days
  // and set their `limited` to true
  const orgsToLimit = await sql`WITH over_limit_days AS (
    SELECT 
      o.id,
      o.name,
      DATE(r.created_at) AS run_date,
      COUNT(r.id) AS daily_runs
    FROM "public"."org" o
    JOIN "public"."project" p ON p.org_id = o.id
    JOIN "public"."run" r ON r.project_id = p.id
    WHERE r.created_at >= CURRENT_DATE - INTERVAL '3 days'
    GROUP BY o.id, o.name, run_date
    HAVING COUNT(r.id) > 1000 AND o.plan = 'free'
),
over_limit_users AS (
    SELECT 
      id,
      COUNT(run_date) AS limit_exceeded_days
    FROM over_limit_days
    GROUP BY id
    HAVING COUNT(run_date) >= 2
)
UPDATE "public"."org" 
SET limited = TRUE 
WHERE id IN (SELECT id FROM over_limit_users)
RETURNING *;`

  for (const org of orgsToLimit) {
    // send telegram message to user
    if (alreadyLimited.find((u) => u.id === org.id)) continue

    await sendTelegramMessage(
      `⛔ limited ${org.name} because too many events`,
      "users",
    )
  }
}

// reset playground allowance
async function resetPlaygroundAllowance() {
  await sql`UPDATE "public"."org" o SET play_allowance = 3 WHERE o.plan = 'free';`
  await sql`UPDATE "public"."org" o SET play_allowance = 1000 WHERE o.plan = 'pro';`
  await sql`UPDATE "public"."org" o SET play_allowance = 1000 WHERE o.plan = 'unlimited' OR o.plan = 'custom';`
}

export default async function resetUsage() {
  try {
    console.log("[JOB]: resetting AI allowance")
    await resetPlaygroundAllowance()
  } catch (error) {
    console.error(error)
  }

  try {
    console.log("[JOB]: updating limited status")
    await updateLimitedStatus()
  } catch (error) {
    console.error(error)
  }
}
