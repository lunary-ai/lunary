import cron from "node-cron"
import sql from "./db"

export function setupCronJobs() {
  cron.schedule(
    "*/20 * * * * *",
    () => {
      sql`refresh materialized view concurrently app_model_names;`
      sql`refresh materialized view concurrently app_tag;`
    },
    { name: "refresh materialized views" },
  )
}
