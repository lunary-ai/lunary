import resetUsage from "@/src/jobs/resetUsage";
import cron from "node-cron";
import purgeRuns from "../jobs/data-retention";
import stripeCounters from "../jobs/stripeMeters";

const EVERY_HOUR = "0 * * * *";
const EVERY_DAY_AT_4AM = "0 4 * * *";
const EVERY_DAY_AT_10AM = "0 10 * * *";

export function setupCronJobs() {
  cron.schedule(EVERY_DAY_AT_10AM, resetUsage, {
    name: "reset usage",
  });

  cron.schedule(EVERY_HOUR, stripeCounters, {
    name: "stripe meters",
  });

  cron.schedule(EVERY_DAY_AT_4AM, purgeRuns, {
    name: "purge runs",
  });
}
