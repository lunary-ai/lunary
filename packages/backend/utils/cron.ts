import cron from "node-cron"
import sql from "./db"
import resetUsage from "@/jobs/resetUsage"
import radarJob from "@/jobs/radar"

export function setupCronJobs() {
  cron.schedule(
    "* * * * *",
    async () => {
      console.log("JOB: refreshing materialized views")
      await sql`refresh materialized view concurrently model_name_cache;`
      await sql`refresh materialized view concurrently tag_cache;`
    },
    { name: "refresh materialized views" },
  )

  cron.schedule("0 10 * * *", resetUsage, {
    name: "reset usage",
  })

  cron.schedule("*/30 * * * * *", radarJob, {
    name: "radar",
  })
}
