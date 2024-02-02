import CHECK_RUNNERS from "@/src/checks"
import sql from "@/src/utils/db"
import { convertChecksToSQL } from "@/src/utils/filters"
import { FilterLogic, LogicElement } from "shared"

type RadarResults = {
  passed: boolean
  filterId?: string
  details?: any
}

const RUNS_BATCH_SIZE = 300 // small batch size to cycle through radars faster making it more equitable
const PARALLEL_BATCH_SIZE = 5

const hasNonSQLFilter = (checks: FilterLogic): boolean =>
  checks.some((check) => {
    if (typeof check === "string") return false

    if (Array.isArray(check)) return hasNonSQLFilter(check)

    const { id } = check

    const runner = CHECK_RUNNERS.find((f) => f.id === id)

    if (runner?.evaluator) {
      return true
    }

    return false
  })

const checkRun = async (
  run: any,
  check: LogicElement,
): Promise<RadarResults> => {
  if (typeof check === "string") {
    // Handle AND or OR
    return { passed: true }
  }

  if (Array.isArray(check)) {
    const logicType = check[0]
    const subChecks = check.slice(1)
    if (logicType === "OR") {
      for (const subCheck of subChecks) {
        const result = await checkRun(run, subCheck)
        if (result.passed) {
          return { passed: true, details: [result] }
        }
      }
      return {
        passed: false,
        details: subChecks.map(() => ({ passed: false })),
      }
    } else {
      // Handle nested AND
      const results: RadarResults[] = await Promise.all(
        subChecks.map((subCheck) => checkRun(run, subCheck)),
      )
      return {
        passed: results.every((result) => result.passed),
        details: results,
      }
    }
  }

  const { id, params } = check
  const runner = CHECK_RUNNERS.find((f) => f.id === id)

  if (!runner || (!runner.sql && !runner.evaluator)) {
    return { passed: true }
  }

  if (runner.sql) {
    const snippet = runner.sql(params)
    const [result] =
      await sql`select * from run where id = ${run.id} and (${snippet})`

    return { passed: !!result, filterId: id }
  }

  return { filterId: runner.id, ...(await runner.evaluator!(run, params)) }
}

const runChecksOnRun = async (radar: any, run: any) => {
  const checks: FilterLogic = radar.checks

  let passed = false
  const results: RadarResults[] = []

  const onlySQL = !hasNonSQLFilter(checks)

  if (onlySQL) {
    // More efficient to do it all in SQL if only SQL filters are used
    const filterSql = convertChecksToSQL(checks)

    const [result] =
      await sql`select * from run where id = ${run.id} and ${filterSql}`

    passed = !!result
  } else {
    const logicType = checks[0]
    const subChecks = checks.slice(1)
    if (logicType === "OR") {
      for (const check of subChecks) {
        const res = await checkRun(run, check)
        results.push(res)
        if (res.passed) {
          passed = true
          break
        }
      }
    } else {
      // Handle nested AND
      for (const check of subChecks) {
        const res = await checkRun(run, check)
        results.push(res)
        passed = res.passed
        if (!res.passed) break
      }
    }
  }

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
  if (jobRunning) {
    return console.warn("JOB: radar scan already running. skipping")
  }

  const radars = await sql`
    SELECT r.* FROM radar r
    JOIN project p ON r.project_id = p.id
    JOIN org o ON p.org_id = o.id
    WHERE o.plan != 'free'
  `

  // For each radar, get all checks
  for (const radar of radars) {
    const runs = await getRadarRuns(radar)

    if (!runs.length) {
      continue
    }

    console.time(`Batch of ${runs.length} - radar ${radar.id}`)

    // for (const run of runs) {
    //   try {
    //     await runChecksOnRun(radar, run)
    //   } catch (error) {
    //     console.error(error)
    //   }
    // }

    for (let i = 0; i < runs.length; i += PARALLEL_BATCH_SIZE) {
      const batch = runs.slice(i, i + PARALLEL_BATCH_SIZE)
      await Promise.all(
        batch.map((run) =>
          runChecksOnRun(radar, run).catch((error) => console.error(error)),
        ),
      )
    }

    console.timeEnd(`Batch of ${runs.length} - radar ${radar.id}`)
  }

  jobRunning = false
}

export default async function runRadarJob() {
  // run in a while loop
  while (true) {
    try {
      console.time("JOB: radar scan")
      await radarJob()
      console.timeEnd("JOB: radar scan")
    } catch (error) {
      console.error(error)
    }
  }
}
