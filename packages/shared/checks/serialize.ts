import type { CheckLogic, CheckParam } from "."
import { CHECKS } from "."

// because dots are used to separate filter parameters, we need to encode them
const encode = (str: string) => encodeURIComponent(str).replace(/\./g, "%2E")

const paramSerializer = (param: CheckParam, value: any) => {
  if (value == undefined) {
    return undefined
  }
  switch (param.type) {
    case "select":
      if (param.multiple) {
        if (!value.length) return undefined
        return value.map(encode).join(",")
      } else {
        return encode(value)
      }
    case "text":
    case "number":
      return encode(value)
    case "date":
      // get timestamp
      return encode(value.getTime())
    default:
      return undefined
  }
}

function deserializeParamValue(
  filterParam: CheckParam,
  v: string,
): any | undefined {
  switch (filterParam.type) {
    case "select":
      if (filterParam.multiple) {
        return v.split(",").map(decodeURIComponent)
      } else {
        return decodeURIComponent(v)
      }
    case "text":
      return decodeURIComponent(v)
    case "number":
      return Number(v)
    case "date":
      return new Date(Number(v))
    default:
      return undefined
  }
}

// This function serializes the filter parameters for storage or transmission
// Example:
// ['AND', {id: 'type', params: {type: 'llm'}}, {id: 'tags', params: {tags: ['some', 'tags']}}]
// Will be serialized to:
// type=llm&tags=some.tags

export function serializeLogic(logic: CheckLogic): string {
  const serializeParamValue = (param: any): string => {
    if (Array.isArray(param)) {
      const all = param.map(serializeParamValue)

      if (all.some((f) => typeof f !== "undefined")) return ""
      return all.join(".")
    } else if (
      param &&
      typeof param === "object" &&
      param.params &&
      !Object.values(param.params).some((f) => typeof f === "undefined")
    ) {
      const data = Object.entries(param.params)
        .map(([key, value]) => {
          const filterParam = CHECKS.find(
            (filter) => filter.id === param.id,
          )?.params.find((param) => (param as CheckParam).id === key)

          if (!filterParam || filterParam.type === "label") {
            return ""
          }

          return paramSerializer(filterParam, value)
        })
        .filter((serializedValue) => serializedValue !== "")
        .join(".")

      if (!data) return ""

      return param.id + "=" + data
    }
    return ""
  }

  return logic
    .map(serializeParamValue)
    .filter((f) => f)
    .join("&")
}

export function deserializeLogic(logicString: string): CheckLogic | undefined {
  const deserializeParam = (param: string): any => {
    const [id, params] = param.split("=")
    const filter = CHECKS.find((filter) => filter.id === id)

    if (!filter) {
      return undefined
    }

    const filterParams = filter.params.filter(
      (param) => param.type !== "label",
    ) as CheckParam[]

    const paramsData: any = {}

    const value = params.split(".")

    for (const [i, v] of value.entries()) {
      const filterParam = filterParams[i]

      if (!filterParam) {
        return undefined
      }

      paramsData[filterParam.id] = deserializeParamValue(filterParam, v)
    }

    return {
      id,
      params: paramsData,
    }
  }

  const logic = logicString
    .split("&")
    .map(deserializeParam)
    .filter((f) => f)

  return ["AND", ...logic] as CheckLogic
}
