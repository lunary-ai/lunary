export type CheckLabel = {
  type: "label"
  label: string
}

export type CheckParam = {
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

export type Check = {
  id: string
  uiType: "basic" | "smart" | "ai"
  name: string
  description?: string
  soon?: boolean
  params: (CheckParam | CheckLabel)[]
  disableInEvals?: boolean
  onlyInEvals?: boolean
}

// [ 'AND, {id, params}, {id, params}, {id, params}, ['OR', {id, params}, {id, params}], ['OR', {id, params}, ['AND', {id, params}, {id, params}]] ]

export type LogicData = {
  id: string
  params: any
}

type LogicNode = ["AND" | "OR", ...LogicElement[]]

export type LogicElement = LogicData | LogicNode

export type CheckLogic = LogicNode
