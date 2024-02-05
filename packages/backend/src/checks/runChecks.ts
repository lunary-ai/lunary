import { FilterLogic, LogicElement } from "shared"
import CHECK_RUNNERS from "."
import sql from "@/src/utils/db"
import { convertChecksToSQL } from "@/src/utils/filters"

type CheckResults = {
  passed: boolean
  filterId?: string
  details?: any
}

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

async function checkRun(run: any, check: LogicElement): Promise<CheckResults> {
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
      const results: CheckResults[] = await Promise.all(
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

    // TODO: change to virtual row
    const [result] =
      await sql`select * from run where id = ${run.id} and (${snippet})`

    return { passed: !!result, filterId: id }
  }

  return { filterId: runner.id, ...(await runner.evaluator!(run, params)) }
}

export async function runChecksOnRun(run: any, checks: FilterLogic) {
  let passed = false
  const results: CheckResults[] = []

  const onlySQL = !hasNonSQLFilter(checks)

  if (onlySQL) {
    // More efficient to do it all in SQL if only SQL filters are used
    const filterSql = convertChecksToSQL(checks)

    // TODO: change to virtual row
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

  return { passed, results }
}
