import { hasAccess } from "shared";
import { useProjectMutation, useProjectSWR, useUser } from ".";
import { fetcher } from "../fetcher";

export function useCharts<T>() {
  const { user } = useUser();
  const { data, isLoading, mutate } = useProjectSWR<T>(
    hasAccess(user?.role, "charts", "list") ? `/charts` : null,
  );

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/charts`,
    fetcher.post,
  );

  return {
    charts: data,
    insert,
    isInserting,
    mutate,
    loading: isLoading,
  };
}

export function useChart<T>(id: string | null, initialData?: any) {
  const { mutate: mutateViews } = useCharts();

  const {
    data: chart,
    isLoading,
    mutate,
  } = useProjectSWR<T>(id && `/charts/${id}`, {
    fallbackData: initialData,
  });

  const { trigger: update } = useProjectMutation(
    id && `/charts/${id}`,
    fetcher.patch,
    {
      onSuccess(data) {
        mutate(data);
        mutateViews();
      },
    },
  );

  const { trigger: remove } = useProjectMutation(
    id && `/charts/${id}`,
    fetcher.delete,
    {
      revalidate: false,
      onSuccess() {
        mutateViews();
      },
    },
  );

  return {
    chart,
    update,
    remove,
    mutate,
    loading: isLoading,
  };
}
