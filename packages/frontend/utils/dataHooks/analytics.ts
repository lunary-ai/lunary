import { useProjectSWR } from "."

export function useErrorAnalytics(
  startDate: Date,
  endDate: Date,
  granularity: string,
  checks: string,
) {
  const { data, isLoading } = useProjectSWR(
    `/analytics/errors?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&granularity=${granularity}&checks=${checks}`,
  )

  return { errorsData: data, isLoading }
}
export function useRunCountAnalytics(
  startDate: Date,
  endDate: Date,
  granularity: string,
  checks: string,
) {
  const { data, isLoading } = useProjectSWR(
    `/analytics/runs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&granularity=${granularity}&checks=${checks}`,
  )

  return { runCountData: data, isLoading }
}
export function useNewUsersAnalytics(
  startDate: Date,
  endDate: Date,
  granularity: string,
) {
  const { data, isLoading } = useProjectSWR(
    `/analytics/users/new?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&granularity=${granularity}`,
  )

  return { newUsersData: data, isLoading }
}
export function useAverageLatencyAnalytics(
  startDate: Date,
  endDate: Date,
  granularity: string,
  checks: string,
) {
  const { data, isLoading } = useProjectSWR(
    `/analytics/latency?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&granularity=${granularity}&checks=${checks}`,
  )

  return { averageLatencyData: data, isLoading }
}
