import { Chart, Dashboard } from "shared/dashboards";
import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";

export function useDashboards() {
  const { data, isLoading, mutate } = useProjectSWR<Dashboard[]>("/dashboards");

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/dashboards`,
    fetcher.post,
  );

  return {
    dashboards: data || [],
    isLoading,
    insert,
    isInserting,
    mutate,
  };
}

export function useDashboard(id: string | undefined) {
  const { mutate: mutateDashboards } = useDashboards();

  const {
    data: dashboard,
    isLoading,
    mutate,
  } = useProjectSWR<Dashboard>(id && `/dashboards/${id}`);

  const { trigger: updateMutation, isMutating } = useProjectMutation(
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

  return {
    dashboard,
    update,
    remove: removeMutation,
    mutate,
    isLoading,
    isMutating,
  };
}

export function useCustomCharts() {
  const { data, isLoading, mutate } = useProjectSWR<Chart[]>(
    "/dashboards/charts/custom",
  );

  const { trigger: createTrigger, isMutating: isCreating } = useProjectMutation(
    "/dashboards/charts/custom",
    fetcher.post,
  );

  const { trigger: updateTrigger, isMutating: isUpdating } = useProjectMutation(
    "/dashboards/charts/custom",
    fetcher.patch,
  );

  const { trigger: deleteTrigger } = useProjectMutation(
    "/dashboards/charts/custom/delete", // switch to delete
    fetcher.post,
  );

  async function deleteCustomChart(id: string) {
    await deleteTrigger({ id });
    await mutate();
  }

  async function insertCustomChart(chart: Chart) {
    await createTrigger(chart);
    await mutate();
  }

  async function updateCustomChart(id: string, chart: Partial<Chart>) {
    await updateTrigger({ id, ...chart });
    await mutate();
  }

  return {
    insert: insertCustomChart,
    update: updateCustomChart,
    customCharts: data || [],
    isLoading,
    isMutating: isCreating || isUpdating,
    remove: deleteCustomChart,
  };
}
