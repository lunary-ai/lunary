import sql from "@/src/utils/db"
import { sendSlackMessage } from "@/src/utils/notifications"
import { LIMITED_EMAIL, sendEmail } from "../emails"
import config from "../utils/config"

async function updateLimitedStatus() {
  if (config.IS_SELF_HOSTED) {
    return
  }
  // set limited = false for all users that have been under the limit
  // for the last 30 days
  const alreadyLimited = await sql`UPDATE "public"."org" p
  SET limited = false 
  WHERE limited = true AND p.id NOT IN (
    SELECT o.id
    FROM "public"."org" o
    JOIN "public"."project" p ON p.org_id = o.id
    JOIN "public"."run" r ON r.project_id = p.id
    WHERE r.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY o.id
    HAVING COUNT(r.id) > 10000
  )
  RETURNING *;
  `

  // get all free users with more than 10000 runs in the last 30 days
  // and set their `limited` to true
  const orgsToLimit = await sql`WITH over_limit_users AS (
    SELECT 
      o.id,
      o.name,
      COUNT(r.id) AS total_runs
    FROM "public"."org" o
    JOIN "public"."project" p ON p.org_id = o.id
    JOIN "public"."run" r ON r.project_id = p.id
    WHERE r.created_at >= CURRENT_DATE - INTERVAL '30 days' AND o.plan = 'free' AND o.limited = false
    GROUP BY o.id, o.name
    HAVING COUNT(r.id) > 10000
)
UPDATE "public"."org" 
SET limited = TRUE 
WHERE id IN (SELECT id FROM over_limit_users)
RETURNING *;`

  for (const org of orgsToLimit) {
    try {
      // send telegram message to user
      if (alreadyLimited.find((u) => u.id === org.id)) continue

      await sendSlackMessage(
        `⛔ limited ${org.name} because too many events`,
        "users",
      )

      // send email to user

      const users =
        await sql`SELECT email, name FROM account WHERE org_id = ${org.id};`

      for (const user of users) {
        await sendEmail(LIMITED_EMAIL(user.email, user.name))
      }
    } catch (error) {
      console.error(error)
    }
  }
}

// reset playground allowance
async function resetPlaygroundAllowance() {
  await sql`UPDATE "public"."org" o SET play_allowance = 3 WHERE o.plan = 'free';`
  await sql`UPDATE "public"."org" o SET play_allowance = 1000 WHERE o.plan = 'pro' OR o.plan = 'team';`
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
