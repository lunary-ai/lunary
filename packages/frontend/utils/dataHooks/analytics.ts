import { useProjectSWR } from ".";

export function useAnalyticsChartData(
  key?: string,
  startDate: Date,
  endDate: Date,
  granularity: string,
  checks?: string,
) {
  const timeZone = new window.Intl.DateTimeFormat().resolvedOptions().timeZone;
  const checksParam = checks ? `&checks=${checks}` : "";
  const { data, isLoading } = useProjectSWR(
    key &&
      `/analytics/${key}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&timeZone=${timeZone}&granularity=${granularity}${checksParam}`,
  );

  return { data, isLoading };
}

export function useTopModels(params: { startDate?: Date; endDate?: Date }) {
  const { startDate, endDate } = params || {};

  const queryParams = new URLSearchParams();
  if (startDate && endDate) {
    const timeZone = new window.Intl.DateTimeFormat().resolvedOptions()
      .timeZone;
    queryParams.append("startDate", startDate.toISOString());
    queryParams.append("endDate", endDate.toISOString());
    queryParams.append("timeZone", timeZone);
  }

  const { data, isLoading } = useProjectSWR(
    params && `/analytics/top/models?${queryParams.toString()}`,
  );

  return { data, isLoading };
}

export function useTopTemplates(startDate: Date, endDate: Date) {
  const timeZone = new window.Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, isLoading } = useProjectSWR(
    `/analytics/top/templates?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&timeZone=${timeZone}`,
  );

  return { data, isLoading };
}
