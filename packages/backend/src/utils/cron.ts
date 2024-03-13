import cron from "node-cron"
import sql from "./db"
import resetUsage from "@/src/jobs/resetUsage"
import radarJob from "@/src/jobs/radar"

const EVERY_MINUTE = "* * * * *"

export function setupCronJobs() {
  cron.schedule(
    EVERY_MINUTE,
    async () => {
      try {
        await sql`refresh materialized view concurrently model_name_cache;`
      } catch (error) {
        console.error(error)
      }
    },
    { name: "refresh model_name_cache" },
  )

  cron.schedule(
    EVERY_MINUTE,
    async () => {
      try {
        await sql`refresh materialized view concurrently tag_cache;`
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
