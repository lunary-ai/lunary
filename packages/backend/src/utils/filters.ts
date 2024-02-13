import { FilterLogic, LogicElement } from "shared"
import sql from "../utils/db"
import CHECK_RUNNERS from "../checks"

const and = (arr: any = []) =>
  arr.reduce((acc: any, x: any) => sql`${acc} AND ${x}`)
const or = (arr: any = []) =>
  arr.reduce((acc: any, x: any) => sql`(${acc} OR ${x})`)

// TODO: unit tests
export function convertChecksToSQL(filtersData: FilterLogic): any {
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
  const sqlFilters = sql`(${logicToSql(filtersData)})`
  return sqlFilters
}
