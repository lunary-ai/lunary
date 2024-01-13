export type FilterParam =
  | {
      type: "select" | "text" | "number" | "date"
      id: string
      label?: string
      unit?: string
      width?: number
      defaultValue?: string | number | boolean
      multiple?: boolean
      options?:
        | Array<{ label: string; value: string }>
        | ((projectId: string, type: string) => string)
    }
  | {
      type: "label"
      label: string
    }

export type Filter = {
  id: string
  name: string
  params: FilterParam[]
  disableInEvals?: boolean
  evaluator?: (run: any, params: any) => Promise<any>
  sql: (params: any) => string // postgres sql
}
