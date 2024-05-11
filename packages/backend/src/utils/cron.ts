import cron from "node-cron"
import sql from "./db"
import resetUsage from "@/src/jobs/resetUsage"
import stripeCounters from "../jobs/stripeMeters"

const EVERY_HOUR = "0 * * * *"

export function setupCronJobs() {
  cron.schedule("0 10 * * *", resetUsage, {
    name: "reset usage",
  })

  cron.schedule(EVERY_HOUR, stripeCounters, {
    name: "stripe meters",
  })
}
