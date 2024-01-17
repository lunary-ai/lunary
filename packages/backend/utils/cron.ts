import cron from "node-cron"
import sql from "./db"
import resetUsage from "@/jobs/resetUsage"

export function setupCronJobs() {
  cron.schedule(
    "*/20 * * * * *",
    () => {
      sql`refresh materialized view concurrently model_name_cache;`
      sql`refresh materialized view concurrently tag_cache;`
    },
    { name: "refresh materialized views" },
  )

  cron.schedule("0 10 * * *", resetUsage, {
    name: "reset usage",
  })
}
