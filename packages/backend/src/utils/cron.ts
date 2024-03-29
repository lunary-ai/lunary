import cron from "node-cron"
import sql from "./db"
import resetUsage from "@/src/jobs/resetUsage"

const EVERY_MINUTE = "* * * * *"

export function setupCronJobs() {
  cron.schedule(
    EVERY_MINUTE,
    async () => {
      const views = [
        "model_name_cache",
        "tag_cache",
        "metadata_cache",
        "feedback_cache",
        "run_parent_feedback_cache",
      ]

      try {
        for (const view of views) {
          await sql`refresh materialized view concurrently ${sql(view)};`
        }
      } catch (error) {
        console.error(error)
      }
    },
    { name: "refresh materialized views" },
  )

  cron.schedule(
    EVERY_MINUTE,
    async () => {
      try {
        await sql`refresh materialized view concurrently metadata_cache;`
      } catch (error) {
        console.error(error)
      }
    },
    { name: "refresh model_name_cache" },
  )

  cron.schedule("0 10 * * *", resetUsage, {
    name: "reset usage",
  })
}
