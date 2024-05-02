import cron from "node-cron"
import sql from "./db"
import resetUsage from "@/src/jobs/resetUsage"

const EVERY_MINUTE = "* * * * *"

export function setupCronJobs() {
  cron.schedule("0 10 * * *", resetUsage, {
    name: "reset usage",
  })
}
