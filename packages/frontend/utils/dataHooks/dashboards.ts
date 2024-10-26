import { hasAccess } from "shared";
import { useProjectMutation, useProjectSWR, useUser } from ".";
import { fetcher } from "../fetcher";
import { DEFAULT_DASHBOARD } from "../analytics";

export function useDashboards() {
  const { user } = useUser();
  const { data, isLoading, mutate } = useProjectSWR(
    hasAccess(user?.role, "dashboards", "list") ? `/dashboards` : null,
  );

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/dashboards`,
    fetcher.post,
  );

  return {
    dashboards: Array.isArray(data) ? [DEFAULT_DASHBOARD, ...data] : data,
    insert,
    isInserting,
    mutate,
    loading: isLoading,
  };
}

export function useDashboard(id: string | null, initialData?: any) {
  if (id === DEFAULT_DASHBOARD.id) {
    return {
      dashboard: DEFAULT_DASHBOARD,
      remove: () => {},
      update: () => {},
      mutate: () => {},
      loading: false,
    };
  }

  const { mutate: mutateViews } = useDashboards();

  const {
    data: dashboard,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/dashboards/${id}`, {
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
    dashboard,
    update,
    remove,
    mutate,
    loading: isLoading,
  };
}
