import { hasAccess } from "shared";
import { useProjectMutation, useProjectSWR, useUser } from ".";
import { fetcher } from "../fetcher";

// TODO: zod schema in shared package, share between frontend and backend
interface Dashboard {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  name: string;
  pinned: boolean;
  description: string | null;
  charts: string[]; // TODO: array of charts
  filters: {
    checks: string;
    dateRange: [string, string];
    granularity: "daily" | "weekly" | "monthly";
  };
  ownerId: string;
}

export function useDashboards() {
  const { data, isLoading, mutate } = useProjectSWR<Dashboard[]>("/dashboards");

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/dashboards`,
    fetcher.post,
    { onSuccess: () => mutate() },
  );

  return {
    dashboards: data || [],
    isLoading,
    insert,
    isInserting,
    mutate,
  };
}

export function useDashboard(id: string) {
  const { mutate: mutateDashboards } = useDashboards();

  const {
    data: dashboard,
    isLoading,
    mutate,
  } = useProjectSWR<Dashboard>(`/dashboards/${id}`);

  const { trigger: update } = useProjectMutation(
    `/dashboards/${id}`,
    fetcher.patch,
    {
      onSuccess(data) {
        mutate(data);
        mutateDashboards();
      },
    },
  );

  const { trigger: remove } = useProjectMutation(
    id && `/dashboards/${id}`,
    fetcher.delete,
    {
      revalidate: false,
      onSuccess() {
        mutateDashboards();
      },
    },
  );

  return {
    dashboard,
    update,
    remove,
    mutate,
    isLoading,
  };
}
