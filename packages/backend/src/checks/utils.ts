import { CheckLogic, LogicElement } from "shared"
import sql from "../utils/db"
import CHECK_RUNNERS from "."

const and = (arr: any = []) =>
  arr.reduce((acc: any, x: any) => sql`${acc} AND ${x}`)
const or = (arr: any = []) =>
  arr.reduce((acc: any, x: any) => sql`(${acc} OR ${x})`)

export function convertChecksToSQL(filtersData: CheckLogic): any {
  const logicToSql = (logicElement: LogicElement): any => {
    if (Array.isArray(logicElement)) {
      const [logicOperator, ...elements] = logicElement

      if (logicOperator === "AND") {
        return and(elements.map(logicToSql))
      } else if (logicOperator === "OR") {
        return or(elements.map(logicToSql))
      }
    } else {
      const runner = CHECK_RUNNERS.find((f) => f.id === logicElement.id)

      if (!runner || !runner.sql) {
        console.warn(
          `No SQL method defined for filter with id ${logicElement.id}`,
        )
        return sql``
      }
      return runner.sql(logicElement.params)
    }
  }
  const sqlChecks = sql`(${logicToSql(filtersData)})`
  return sqlChecks
}
