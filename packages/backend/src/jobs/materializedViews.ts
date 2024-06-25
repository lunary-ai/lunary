import sql from "../utils/db"
import { sleep } from "../utils/misc"

const REFRESH_FREQUENCY = process.env.NODE_ENV === "production" ? 1000 : 10000

export async function startMaterializedViewRefreshJob() {
  try {
    const views = [
      "model_name_cache",
      "tag_cache",
      "metadata_cache",
      "feedback_cache",
      "run_parent_feedback_cache",
    ]

    while (true) {
      for (const view of views) {
        await sql`refresh materialized view concurrently ${sql(view)};`.catch(
          (error) => {
            console.error(`Error refreshing materialized view: ${view}`)
            console.error(error)
          },
        )
      }

      await sleep(REFRESH_FREQUENCY)
    }
  } catch (error) {
    console.error(error)
  }
}
