import { useProjectSWR } from "."

export function useAnalyticsData(
  key: string,
  startDate: Date,
  endDate: Date,
  granularity: string,
  checks?: string,
) {
  const checksParam = checks ? `&checks=${checks}` : ""
  const { data, isLoading } = useProjectSWR(
    `/analytics/${key}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&granularity=${granularity}${checksParam}`,
  )

  return { data, isLoading }
}
