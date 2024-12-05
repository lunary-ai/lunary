import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";

// TODO: zod schema in shared package, share between frontend and backend
export interface Dashboard {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  ownerId: string;
  name: string;
  description: string | null;
  checks: any[];
  isHome: boolean;
  charts: string[];
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

  const { trigger: updateMutation } = useProjectMutation(
    `/dashboards/${id}`,
    fetcher.patch,
    { onSuccess: () => mutateDashboards() },
  );

  function update(data: Partial<Dashboard>) {
    updateMutation(data, { optimisticData: { ...dashboard, ...data } });
  }

  const { trigger: removeMutation } = useProjectMutation(
    id && `/dashboards/${id}`,
    fetcher.delete,
    {
      revalidate: false,
      onSuccess() {
        mutateDashboards();
      },
    },
  );

  // function remove() {
  //   removeMutation();
  // }

  return {
    dashboard,
    update,
    remove: removeMutation,
    mutate,
    isLoading,
  };
}
