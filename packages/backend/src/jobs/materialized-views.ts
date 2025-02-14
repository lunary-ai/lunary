import sql from "../utils/db";
import { sleep } from "../utils/misc";

export async function startMaterializedViewRefreshJob() {
  // TODO: locks
  if (process.env.DISABLE_MATERIALIZED_VIEW_REFRESH) {
    return;
  }
  try {
    const views = ["metadata_cache"];

    while (true) {
      for (const view of views) {
        await sql`refresh materialized view concurrently ${sql(view)};`.catch(
          (error) => {
            console.error(`Error refreshing materialized view: ${view}`);
            console.error(error);
          },
        );
      }

      await sleep(5 * 60 * 1000);
    }
  } catch (error) {
    console.error(error);
  }
}
