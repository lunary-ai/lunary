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
  charts: string[];
  filters: {
    checks: string;
    dateRange: [string, string];
    granularity: "daily" | "weekly" | "monthly";
  };
  ownerId: string;
}

export function useDashboards() {
  const { user } = useUser();
  const { data, isLoading, mutate } = useProjectSWR<Dashboard[]>(
    hasAccess(user?.role, "dashboards", "list") ? `/dashboards` : null,
  );

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/dashboards`,
    fetcher.post,
  );

  return {
    dashboards: (data || []) as Dashboard[],
    insert,
    isInserting,
    mutate,
    isLoading,
  };
}

export function useDashboard(id: string | null, initialData?: any) {
  const { mutate: mutateViews } = useDashboards();

  const {
    data: dashboard,
    isLoading,
    mutate,
  } = useProjectSWR<Dashboard>(id && `/dashboards/${id}`, {
    fallbackData: initialData,
  });

  const { trigger: update } = useProjectMutation(
    id && `/dashboards/${id}`,
    fetcher.patch,
    {
      onSuccess(data) {
        mutate(data);
        mutateViews();
      },
    },
  );

  const { trigger: remove } = useProjectMutation(
    id && `/dashboards/${id}`,
    fetcher.delete,
    {
      revalidate: false,
      onSuccess() {
        mutateViews();
      },
    },
  );

  return {
    dashboard: dashboard as Dashboard,
    update,
    remove,
    mutate,
    loading: isLoading,
  };
}
