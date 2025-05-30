import { useProjectSWR, useProjectMutation } from ".";
import { fetcher } from "../fetcher";

export interface Alert {
  id: string;
  name: string;
  status: "healthy" | "triggered" | "disabled";
  threshold: number;
  metric: string;
  timeFrameMinutes: number;
  email?: string;
  webhookUrl?: string;
  createdAt: string;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  startTime: string;
  endTime: string;
  trigger: number;
  status: "resolved" | "ongoing";
}

export function useAlerts() {
  const { data, error, isLoading, mutate } = useProjectSWR<Alert[]>("/alerts");

  const { trigger: create, isMutating: isCreating } = useProjectMutation(
    "/alerts",
    fetcher.post,
    { onSuccess: () => mutate() },
  );

  return {
    alerts: data || [],
    error,
    isLoading,
    create,
    isCreating,
    mutate,
  };
}

export function useAlert(id: string) {
  const { data, error, isLoading, mutate } = useProjectSWR<Alert>(
    `/alerts/${id}`,
  );

  const { trigger: update, isMutating: isUpdating } = useProjectMutation(
    id ? `/alerts/${id}` : null,
    fetcher.patch,
    { onSuccess: () => mutate() },
  );

  const { trigger: remove } = useProjectMutation(
    id ? `/alerts/${id}` : null,
    fetcher.delete,
    { revalidate: false, onSuccess: () => mutate() },
  );

  return {
    alert: data,
    error,
    isLoading,
    update,
    isUpdating,
    remove,
    mutate,
  };
}

export function useAlertHistory() {
  const { data, error, isLoading, mutate } =
    useProjectSWR<AlertHistory[]>("/alerts/history");

  return {
    history: data || [],
    error,
    isLoading,
    mutate,
  };
}
