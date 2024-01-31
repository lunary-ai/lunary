import { FILTERS, FilterLogic, LogicElement } from "shared"
import sql from "./db"

const and = (arr: any = []) =>
  arr.reduce((acc: any, x: any) => sql`${acc} AND ${x}`)
const or = (arr: any = []) =>
  arr.reduce((acc: any, x: any) => sql`(${acc} OR ${x})`)

export function convertFiltersToSQL(filtersData: FilterLogic): any {
  const logicToSql = (logicElement: LogicElement): any => {
    if (Array.isArray(logicElement)) {
      const [logicOperator, ...elements] = logicElement

      if (logicOperator === "AND") {
        return and(elements.map(logicToSql))
      } else if (logicOperator === "OR") {
        return or(elements.map(logicToSql))
      }
    } else {
      const filter = FILTERS.find((f) => f.id === logicElement.id)
      if (!filter || !filter.sql) {
        console.warn(
          `No SQL method defined for filter with id ${logicElement.id}`,
        )
        return sql``
      }
      return filter.sql(sql, logicElement.params)
    }
  }
  const sqlFilters = logicToSql(filtersData)
  return sqlFilters
}
