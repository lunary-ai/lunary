import { useProjectInfiniteSWR } from "."

export function useExternalUsers({
  startDate,
  endDate,
  search,
}: {
  startDate?: Date
  endDate?: Date
  search?: string
}) {
  const queryParams = new URLSearchParams()
  if (startDate && endDate) {
    const timeZone = new window.Intl.DateTimeFormat().resolvedOptions().timeZone
    queryParams.append("startDate", startDate.toISOString())
    queryParams.append("endDate", endDate.toISOString())
    queryParams.append("timeZone", timeZone)
  }

  if (search) {
    queryParams.append("search", search)
  }

  const { data, loading, validating, loadMore } = useProjectInfiniteSWR(
    `/external-users?${queryParams.toString()}`,
  )

  return { users: data, loading, validating, loadMore }
}
