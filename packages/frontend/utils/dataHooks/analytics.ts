import { useProjectSWR } from "."

export function useAnalyticsData(
  key: string,
  startDate: Date,
  endDate: Date,
  granularity: string,
  checks?: string,
) {
  const timeZone = new window.Intl.DateTimeFormat().resolvedOptions().timeZone
  const checksParam = checks ? `&checks=${checks}` : ""
  const { data, isLoading } = useProjectSWR(
    `/analytics/${key}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&timeZone=${timeZone}&granularity=${granularity}${checksParam}`,
  )

  return { data, isLoading }
}
