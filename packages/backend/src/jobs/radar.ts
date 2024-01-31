import sql from "@/src/utils/db"
import { convertFiltersToSQL } from "@/src/utils/filters"
import { FILTERS, FilterLogic } from "shared"

type RadarResults = {
  passed: boolean
  details: any
}

// TODO: follow AND/OR nested logic
const runChecksOnRun = async (radar, run) => {
  const checks: FilterLogic[] = radar.checks
  const results = []

  for (const check of checks) {
    if (typeof check === "string") {
      // Handle AND or OR
      continue
    }
    try {
      const { id, params } = check

      const filter = FILTERS.find((f) => f.id === id)

      if (!filter) {
        console.error(`Filter ${id} not found`)
        continue
      }

      const result = await filter.evaluator(run, paramsData)

      results.push({
        filterId: id,
        ...result,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const [row] = await sql`
    INSERT INTO radar_results ${sql({
      radarId: radar.id,
      runId: run.id,
      results,
      passed: results.every((r) => r.passed),
    })}
    RETURNING *
  `
}

const BATCH_SIZE = 500

// get all runs that don't have radar results
// oldest first, limit 300 per batch
async function getRadarRuns(radar: any) {
  const filtersQuery = convertFiltersToSQL(radar.view)

  const excludedRunsSubquery = sql`select run_id from radar_results where radar_id = ${radar.id}`
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
      //   await runChecksOnRun(radar, run)
    }
  }

  jobRunning = false
}
