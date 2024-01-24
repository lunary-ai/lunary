import sql from "@/utils/db"
import { convertFiltersToSQL } from "@/utils/filters"
import { FILTERS, FilterLogic } from "shared"

type RadarResults = {
  passed: boolean
  details: any
}

// TODO: follow AND/OR nested logic
const runChecksOnRun = async (radar: any, run: any) => {
  const checks: FilterLogic[] = radar.checks

  // const results = []
  let passed = true

  const filterSql = convertFiltersToSQL(checks)

  // for (const check of checks) {
  //   if (typeof check === "string") {
  //     // Handle AND or OR
  //     continue
  //   }
  //   if (Array.isArray(check)) {
  //     // Handle nested AND/OR
  //     continue
  //   }
  //   try {
  //     const { id, params } = check

  //     const filter = FILTERS.find((f) => f.id === id)

  //     if (!filter) {
  //       console.error(`Filter ${id} not found`)
  //       continue
  //     }

  //     if (!filter.sql) {
  //       console.error(`Filter ${id} has no sql function`)
  //       continue
  //     }

  // const result = await filter.evaluator(run, paramsData)

  // const filterSql = filter.sql(sql, params)

  // make virtual row to check if filter passes
  const [result] =
    await sql`select * from run where id = ${run.id} and (${filterSql})`

  if (!result) {
    passed = false
  }

  console.log(`Run ${run.id} passed: ${passed}`)

  //     results.push({
  //       filterId: id,
  //       passed: !!result,
  //     })
  //   } catch (e) {
  //     console.error(e)
  //   }
  // }

  await sql`
    insert into radar_result ${sql({
      radarId: radar.id,
      runId: run.id,
      // results,
      passed,
    })}
    returning *
  `
}

const BATCH_SIZE = 500

// get all runs that don't have radar results
// oldest first, limit 300 per batch
async function getRadarRuns(radar: any) {
  const filtersQuery = convertFiltersToSQL(radar.view)

  const excludedRunsSubquery = sql`select run_id from radar_result where radar_id = ${radar.id}`
  return await sql`
    select * from run
    where 
      project_id = ${radar.projectId}
      and ${filtersQuery}
      and id not in (${excludedRunsSubquery})
    order by created_at asc
    limit ${BATCH_SIZE}
  `
}

let jobRunning = false

export default async function radarJob() {
  if (jobRunning) {
    console.warn("JOB: radar scan already running. skipping")
    return
  }

  // Get all runs from orgs in plan 'unlimited' or 'custom'

  const radars = await sql`SELECT * FROM radar`

  // For each radar, get all checks

  for (const radar of radars) {
    const runs = await getRadarRuns(radar)
    console.log(`Analyzing ${runs.length} runs for radar ${radar.id}`)

    for (const run of runs) {
      await runChecksOnRun(radar, run)
    }
  }

  jobRunning = false
}

await radarJob()
