import sql from "@/src/utils/db"
import { convertChecksToSQL } from "@/src/utils/checks"
import { CheckLogic } from "shared"
import { runChecksOnRun } from "../checks/runChecks"
import { sleep } from "../utils/misc"

const RUNS_BATCH_SIZE = 300 // small batch size to cycle through radars faster making it more equitable
const PARALLEL_BATCH_SIZE = 5

async function runRadarChecksOnRun(radar: any, run: any) {
  const checks: CheckLogic = radar.checks

  const { passed, results } = await runChecksOnRun(run, checks, true)

  await sql`
    insert into radar_result ${sql({
      radarId: radar.id,
      runId: run.id,
      results,
      passed,
    })}
    returning *
  `
}

// get all runs that don't have radar results
// oldest first, limit 300 per batch
async function getRadarRuns(radar: any) {
  const filtersQuery = convertChecksToSQL(radar.view)

  const excludedRunsSubquery = sql`select run_id from radar_result where radar_id = ${radar.id}`

  // get more recent runs first
  return await sql`
    select * from run
    where 
      project_id = ${radar.projectId}
      and (${filtersQuery})
      and id not in (${excludedRunsSubquery})
    order by created_at desc
    limit ${RUNS_BATCH_SIZE}
  `
}

let jobRunning = false

async function radarJob() {
  const [{ count: runsCount }] = await sql`select count(*)::int from run`

  if (runsCount === 0) {
    // [Radars] No runs, waiting 20 seconds
    await sleep(20000)
  }

  if (jobRunning) {
    return console.warn("JOB: radar scan already running. skipping")
  }

  const radars = await sql`
    SELECT r.* FROM radar r
    JOIN project p ON r.project_id = p.id
    JOIN org o ON p.org_id = o.id
    WHERE o.plan != 'free'
  `

  let hasRadarRuns = false // used for limiting logging in the while loop

  for (const radar of radars) {
    const runs = await getRadarRuns(radar)

    if (runs.length) {
      hasRadarRuns = true
    }

    if (!runs.length) {
      continue
    }

    console.time(`Batch of ${runs.length} - radar ${radar.id}`)

    for (let i = 0; i < runs.length; i += PARALLEL_BATCH_SIZE) {
      const batch = runs.slice(i, i + PARALLEL_BATCH_SIZE)
      await Promise.all(
        batch.map((run) =>
          runRadarChecksOnRun(radar, run).catch((error) =>
            console.error(error),
          ),
        ),
      )
    }

    console.timeEnd(`Batch of ${runs.length} - radar ${radar.id}`)
  }

  jobRunning = false
  return hasRadarRuns
}

export default async function runRadarJob() {
  while (true) {
    try {
      await radarJob()
    } catch (error) {
      console.error(error)
    }
  }
}
