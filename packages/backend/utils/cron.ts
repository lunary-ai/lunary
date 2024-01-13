import cron from "node-cron"
import sql from "./db"
import resetUsage from "@/jobs/resetUsage"

export function setupCronJobs() {
  cron.schedule(
    "*/20 * * * * *",
    () => {
      sql`refresh materialized view concurrently app_model_names;`
      sql`refresh materialized view concurrently app_tag;`
    },
    { name: "refresh materialized views" },
  )

  cron.schedule("0 10 * * *", resetUsage, {
    name: "reset usage",
  })
}
