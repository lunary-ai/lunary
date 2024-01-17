import sql from "@/utils/db"
import { FILTERS, FilterParam, SavedFilterData } from "shared"

type RadarResults = {
  passed: boolean
  details: any
}

const runChecksOnRun = async (radar, run) => {
  const checks: SavedFilterData[] = radar.checks
  const results = []

  for (const check of checks) {
    try {
      const { id, paramsData } = check

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

export default async function radarJob() {
  // Get all runs from orgs in plan 'unlimited' or 'custom'

  // Get all radars

  const radars = await sql`SELECT * FROM radars`

  // For each radar, get all checks

  for (const radar of radar) {
  }
}
