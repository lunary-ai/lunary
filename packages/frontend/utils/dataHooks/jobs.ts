import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";
import { jobSchema, type Job } from "shared/schemas/job";

export function useJob(id?: string | null) {
  const { data, isLoading, mutate } = useProjectSWR<Job>(
    id ? `/jobs/${id}` : null,
    {
      refreshInterval: 1000,
    },
  );
  const job = data ? jobSchema.parse(data) : undefined;

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
    job,
    isLoading,
    isRemoving,
    remove,
    mutate,
  };
}

export function useRefreshCostsJob() {
  const {
    data,
    isLoading,
    mutate,
  } = useProjectSWR<Job | null>("/jobs/refresh-costs", {
    refreshInterval: (j: Job | null | undefined) =>
      j && ["pending", "running"].includes(j.status) ? 2_000 : 0,
    onErrorRetry: (err, _key, _cfg, revalidate, opts) => {
      if (err?.status === 404) return;
      if (opts.retryCount <= 3) revalidate(opts);
    },
  });
  const job =
    data === undefined ? undefined : data === null ? null : jobSchema.parse(data);

  const { trigger: startTrigger, isMutating: isStarting } = useProjectMutation(
    "/jobs/refresh-costs",
    fetcher.post,
    {
      optimisticData: (current?: Job | null) => {
        if (current) {
          return {
            ...current,
            status: "pending",
            endedAt: null,
            progress: current.progress ?? 0,
          };
        }

        const now = new Date().toISOString();
        return {
          id: "optimistic",
          orgId: "",
          type: "refresh-costs",
          createdAt: now,
          endedAt: null,
          status: "pending",
          progress: 0,
          error: null,
          payload: null,
        };
      },
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

export function useIntentReclusterJob(evaluatorId?: string) {
  const path = evaluatorId ? `/jobs/intent-recluster/${evaluatorId}` : null;

  const { data, isLoading, mutate } = useProjectSWR<Job | null>(path, {
    refreshInterval: (job: Job | null | undefined) =>
      job && ["pending", "running"].includes(job.status) ? 2_000 : 0,
    onErrorRetry: (err, _key, _cfg, revalidate, opts) => {
      if (err?.status === 404) return;
      if (opts.retryCount <= 3) revalidate(opts);
    },
  });
  const job =
    data === undefined ? undefined : data === null ? null : jobSchema.parse(data);

  const { trigger: startTrigger, isMutating: isStarting } = useProjectMutation(
    evaluatorId ? `/evaluators/${evaluatorId}/recluster` : null,
    fetcher.post,
    {
      onSuccess: async () => {
        await mutate();
      },
    },
  );

  async function start(maxIntents: number) {
    if (!evaluatorId) return;
    const response = await startTrigger({ maxIntents });
    await mutate();
    return response;
  }

  return {
    job: job ?? null,
    isLoading,
    isStarting,
    start,
    mutate,
  };
}
