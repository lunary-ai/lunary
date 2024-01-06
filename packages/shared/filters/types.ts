export type FilterParam = {
  type: "select" | "text" | "multiselect" | "number" | "date"
  id: string
  label?: string
  unit?: string
  options?:
    | Array<{ label: string; value: string }>
    | ((projectId: string, type: string) => string)
}

export type Filter = {
  id: string
  name: string
  params: FilterParam[]
  evaluator?: (run: any, params: any) => Promise<any>
  sql: (params: any) => string // postgres sql
}
