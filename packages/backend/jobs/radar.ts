import sql from "@/utils/db"
import { convertFiltersToSQL } from "@/utils/filters"
import { FILTERS, FilterLogic } from "shared"

type RadarResults = {
  passed: boolean
  filterId?: string
  details?: any
}

const hasNonSQLFilter = (checks: any) =>
  checks.some((check: any) => {
    if (typeof check === "string") return false

    if (Array.isArray(check)) return hasNonSQLFilter(check)

    const { id } = check

    const filter = FILTERS.find((f) => f.id === id)

    if (filter?.evaluator) {
      return true
    }

    return false
  })

const checkRun = async (run: any, check: any) => {
  if (typeof check === "string") {
    // Handle AND or OR
    return { passed: true }
  }

  if (Array.isArray(check)) {
    // Handle nested AND/OR
    const checkRun = await Promise.all(check.map((c) => checkRun(run, c)))
    return { passed: checkRun.every((c) => c?.passed), details: checkRun }
  }

  const { id, params } = check
  const filter = FILTERS.find((f) => f.id === id)

  if (!filter || (!filter.sql && !filter.evaluator)) {
    return { passed: true }
  }

  if (filter.sql) {
    const snippet = filter.sql(sql, params)
    const [result] =
      await sql`select * from run where id = ${run.id} and (${snippet})`
    return { passed: !!result, filterId: id }
  }

  return { filterId: filter.id, ...(await filter.evaluator(run, params)) }
}

// TODO: follow AND/OR nested logic
const runChecksOnRun = async (radar: any, run: any) => {
  const checks: FilterLogic[] = radar.checks

  let passed = true
  const results: RadarResults[] = []

  const onlySQL = !hasNonSQLFilter(checks)

  if (onlySQL) {
    // More efficient to do it all in SQL if only SQL filters are used
    const filterSql = convertFiltersToSQL(checks)

    const [result] =
      await sql`select * from run where id = ${run.id} and (${filterSql})`

    passed = !!result
  } else {
    for (const check of checks) {
      const res = await checkRun(run, check)

      results.push(res)

      passed = res.passed

      if (!res.passed) break
    }
  }

  console.log(`Run ${run.id} passed: ${passed}`)

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

const BATCH_SIZE = 1000

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

  const radars = await sql`SELECT * FROM radar`

  // For each radar, get all checks
  for (const radar of radars) {
    const runs = await getRadarRuns(radar)
    console.log(`Analyzing ${runs.length} runs for radar ${radar.id}`)

    for (const run of runs) {
      try {
        await runChecksOnRun(radar, run)
      } catch (error) {
        console.error(error)
      }
    }
  }

  jobRunning = false
}

await radarJob()
