export type FilterLabel = {
  type: "label"
  label: string
}

export type FilterParam = {
  type: "select" | "text" | "number" | "date"
  id: string
  unit?: string
  max?: number
  min?: number
  step?: number
  width?: number
  placeholder?: string
  render?: (value: any) => React.ReactNode
  defaultValue?: string | number | boolean | string[]
  multiple?: boolean
  options?:
    | Array<{ label: string; value: string }>
    | ((projectId: string, type: string) => string)
}

export type Filter = {
  id: string
  uiType: "basic" | "smart" | "ai"
  name: string
  description?: string
  soon?: boolean
  params: (FilterParam | FilterLabel)[]
  disableInEvals?: boolean
  onlyInEvals?: boolean
}

// export type SavedFilterData = {
//   id: string
//   paramsData: { id: string; value: any }[]
// }

// [ 'AND, {id, params}, {id, params}, {id, params}, ['OR', {id, params}, {id, params}], ['OR', {id, params}, ['AND', {id, params}, {id, params}]] ]

export type LogicData = {
  id: string
  params: any
}

type LogicNode = ["AND" | "OR", ...LogicElement[]]

export type LogicElement = LogicData | LogicNode

export type FilterLogic = LogicNode
