import type { CheckLogic, CheckParam } from "."
import { CHECKS } from "."

// because dots are used to separate filter parameters, we need to encode them
const encode = (str: string) => encodeURIComponent(str).replace(/\./g, "%2E")

function paramSerializer(param: CheckParam, value: any) {
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
      return encode(new Date(value).toISOString())
    default:
      return undefined
  }
}

function deserializeParamValue(
  filterParam: CheckParam,
  value: string,
): any | undefined {
  // Deserialize based on the filter parameter type
  switch (filterParam.type) {
    case "select":
      if (filterParam.multiple) {
        return value.split(",").map(decodeURIComponent)
      } else {
        return decodeURIComponent(value)
      }
    case "text":
      return decodeURIComponent(value)
    case "number":
      return Number(decodeURIComponent(value))
    case "date":
      if (value === "lt" || value === "gt") {
        return decodeURIComponent(value)
      }
      return new Date(decodeURIComponent(value))
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
  function serializeParamValue(param: any): string {
    if (Array.isArray(param)) {
      const all = param.map(serializeParamValue)
      return all.filter(Boolean).join(".")
    } else if (param && typeof param === "object" && param.params) {
      const filter = CHECKS.find((filter) => filter.id === param.id)
      if (!filter) {
        return ""
      }

      const filterParams = filter.params.filter(
        (param) => param.type !== "label",
      ) as CheckParam[]

      // we look at the original filter params keys to make sure they are oredered correctly
      const data = filterParams
        .map((filterParam) => {
          const value =
            filterParam.id in param.params ? param.params[filterParam.id] : ""

          const serialized = paramSerializer(filterParam, value)
          return serialized !== undefined ? serialized : ""
        })
        .filter(Boolean)
        .join(".")

      return param.id + "=" + data
    }
    return ""
  }

  let finalResult = logic.map(serializeParamValue).filter(Boolean).join("&")

  // Check if the first logic item is 'OR' and prepend it to the serialized string
  if (logic[0] === "OR") {
    finalResult = "OR&" + finalResult
  }

  return finalResult
}

export function deserializeLogic(
  logicString: string,
  returnEmpty?: boolean,
): CheckLogic | undefined {
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

    const values: string[] = params
      .split(".")
      .map((value) => value.replaceAll("%2C", ",").replaceAll("%2E", "."))

    for (const [i, v] of values.entries()) {
      const filterParam = filterParams[i]

      if (!filterParam) {
        return undefined
      }

      if (!returnEmpty && v === "") {
        return undefined
      }

      // If returnEmpty is true, we return undefined if the value is an empty string,
      // otherwise we don't return the check at all
      const deserializedValue =
        v === "" ? undefined : deserializeParamValue(filterParam, v)

      paramsData[filterParam.id] = deserializedValue
    }

    return {
      id,
      params: paramsData,
    }
  }

  const isOrLogic = logicString.startsWith("OR&")
  const logic = logicString
    .replace(/^OR&/, "")
    .split("&")
    .map(deserializeParam)
    .filter(Boolean)

  return [isOrLogic ? "OR" : "AND", ...logic] as CheckLogic
}
