import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";

// TODO: share zod schema with backend (use codex)
export interface Job {
  id: string;
  createdAt: string;
  endedAt: string | null;
  orgId: string;
  type: "refresh-costs";
  status: "pending" | "running" | "done" | "failed";
  progress: number;
  error: string | null;
}

export function useJob(id?: string | null) {
  const { data, isLoading, mutate } = useProjectSWR<Job>(
    id ? `/jobs/${id}` : null,
    {
      refreshInterval: 1000,
    },
  );

  const { trigger: removeTrigger, isMutating: isRemoving } = useProjectMutation(
    id ? `/jobs/${id}` : null,
    fetcher.delete,
    {
      revalidate: false,
    },
  );

  async function remove() {
    if (!id) return;
    await removeTrigger();
  }

  return {
    job: data,
    isLoading,
    isRemoving,
    remove,
    mutate,
  };
}

export function useRefreshCostsJob() {
  const {
    data: job,
    isLoading,
    mutate,
  } = useProjectSWR<Job>("/jobs/refresh-costs", {
    refreshInterval: (j: Job | undefined) =>
      j && ["pending", "running"].includes(j.status) ? 2_000 : 0,
    onErrorRetry: (err, _key, _cfg, revalidate, opts) => {
      if (err?.status === 404) return;
      if (opts.retryCount <= 3) revalidate(opts);
    },
  });

  const { trigger: startTrigger, isMutating: isStarting } = useProjectMutation(
    "/jobs/refresh-costs",
    fetcher.post,
    {
      optimisticData: (current?: Job) => ({
        ...(current || {
          id: "optimistic",
          orgId: "",
          type: "refresh-costs",
          startedAt: new Date().toISOString(),
          finishedAt: null,
          progress: 0,
          error: null,
        }),
        status: "pending",
      }),
      onSuccess: async () => {
        mutate();
      },
    },
  );

  async function startRefresh() {
    await startTrigger();
  }

  const { trigger: deleteTrigger, isMutating: isDeleting } = useProjectMutation(
    job ? `/jobs/${job.id}` : null,
    fetcher.delete,
    { revalidate: false },
  );

  async function removeRefreshJob() {
    if (!job) return;
    await deleteTrigger();
    mutate();
  }

  return {
    job,
    isStarting,
    isDeleting,
    isLoading,
    start: startRefresh,
    remove: removeRefreshJob,
    mutate,
  };
}
