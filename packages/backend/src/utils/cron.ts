import resetUsage from "@/src/jobs/resetUsage";
import cron from "node-cron";
import purgeRuns from "../jobs/data-retention";
import stripeCounters from "../jobs/stripeMeters";

const EVERY_HOUR = "0 * * * *";
const EVERY_DAY_AT_10AM = "0 10 * * *";
const EVERY_DAY_AT_MIDNIGHT = "0 0 * * *";

export function setupCronJobs() {
  cron.schedule(EVERY_DAY_AT_10AM, resetUsage, {
    name: "reset usage",
  });

  cron.schedule(EVERY_HOUR, stripeCounters, {
    name: "stripe meters",
  });

  cron.schedule(EVERY_DAY_AT_MIDNIGHT, purgeRuns, {
    name: "purge runs",
  });
}
