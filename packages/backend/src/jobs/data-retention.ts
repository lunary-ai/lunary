import config from "../utils/config"
import sql from "../utils/db"
import * as Sentry from "@sentry/node"

export default async function purgeRuns() {
  if (config.IS_SELF_HOSTED) {
    return
  }
  try {
    const deletedRunsCount = await sql.begin(async (sql) => {
      await sql`create temporary table runs_to_delete_temp (run_id uuid)`

      await sql`
        with orgs as (
          select
            id,
            data_retention_days
          from
            org
          where
            data_retention_days is not null
            and plan != 'free'
          
          union all
          
          select
            id,
            30 as data_retention_days
          from
            org
          where
            plan = 'free'
        ),
        runs_to_delete as (
          select
            r.id as run_id
          from
            orgs o
            join project p on o.id = p.org_id
            join run r on p.id = r.project_id
          where
            r.created_at < now() - interval '1 day' * o.data_retention_days
            order by r.created_at desc
        )
        insert into runs_to_delete_temp
        select
          run_id
        from
          runs_to_delete
      `

      await sql`delete from evaluation_result_v2 where evaluation_result_v2.run_id in (select run_id from runs_to_delete_temp)`
      const { count } =
        await sql`delete from run where id in (select run_id from runs_to_delete_temp)`

      await sql`drop table runs_to_delete_temp`
      return count
    })
    console.info(
      `[JOB] Data retention job completed: ${deletedRunsCount} runs purged`,
    )
  } catch (error) {
    console.error(error)
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error)
    }
  }
}
