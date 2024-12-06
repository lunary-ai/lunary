import { LogicNode, serializeLogic } from "shared";
import { useProjectSWR } from ".";

function getPrefix(key: string) {
  if (key === "users/top") {
    return "/external-users";
  }

  return `/analytics/${key}`;
}

// TODO: Generics
export function useAnalyticsChartData<T>(
  key: string | null | undefined,
  startDate: Date,
  endDate: Date,
  granularity: string,
  checks?: LogicNode,
  firstDimensionKey: string | null = null,
  secondDimensionKey: string | null = null,
) {
  const timeZone = new window.Intl.DateTimeFormat().resolvedOptions().timeZone;
  const checksParam = checks ? `&checks=${serializeLogic(checks)}` : "";
  const { data, isLoading, error } = useProjectSWR<T[]>(
    key
      ? `${getPrefix(key)}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&timeZone=${timeZone}&granularity=${granularity}${checksParam}`
      : undefined,
  );

  return { data: data || [], isLoading, error };
}

export function useTopModels<T>(params: {
  startDate?: Date;
  endDate?: Date;
  checks?: string;
}) {
  const { startDate, endDate, checks } = params || {};

  const queryParams = new URLSearchParams();
  if (startDate && endDate) {
    const timeZone = new window.Intl.DateTimeFormat().resolvedOptions()
      .timeZone;
    queryParams.append("startDate", startDate.toISOString());
    queryParams.append("endDate", endDate.toISOString());
    queryParams.append("timeZone", timeZone);
  }

  if (checks) {
    queryParams.append("checks", checks);
  }

  const { data, isLoading } = useProjectSWR<T>(
    params && `/analytics/models/top?${queryParams.toString()}`,
  );

  return { data, isLoading };
}

export function useTopTemplates<T>(
  startDate: Date,
  endDate: Date,
  checks?: string,
) {
  const timeZone = new window.Intl.DateTimeFormat().resolvedOptions().timeZone;
  const checksParam = checks ? `&checks=${checks}` : "";
  const { data, isLoading } = useProjectSWR<T>(
    `/analytics/top/templates?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&timeZone=${timeZone}${checksParam}`,
  );

  return { data, isLoading };
}
