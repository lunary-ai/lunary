import { useProjectSWR, useProjectMutation } from ".";
import { fetcher } from "../fetcher";

/* ────────────────────────────────────────────────────────────
   1. useEvals – list + create
   ──────────────────────────────────────────────────────────── */

export function useEvals() {
  const { data, isLoading, mutate } = useProjectSWR(`/evals`);

  const { trigger: createEval, isMutating: isCreating } = useProjectMutation(
    `/evals`,
    fetcher.post,
    {
      onSuccess: () => mutate(),
      optimisticData: (currentData, newData) =>
        currentData ? [...currentData, newData] : [newData],
    },
  );

  return {
    evals: data,
    isLoading,
    createEval,
    isCreating,
    mutate,
  };
}

/* ────────────────────────────────────────────────────────────
   2. useEvalDetails – fetch + update + delete (single eval)
   ──────────────────────────────────────────────────────────── */

export function useEvalDetails(evalId?: string) {
  const { data, isLoading, mutate } = useProjectSWR(
    evalId ? `/evals/${evalId}` : null,
  );

  const { trigger: updateEval, isMutating: isUpdating } = useProjectMutation(
    evalId ? `/evals/${evalId}` : null,
    fetcher.patch,
    {
      onSuccess: () => mutate(),
      optimisticData: (currentData, newData) =>
        currentData ? { ...currentData, ...newData } : currentData,
    },
  );

  const { trigger: deleteEval, isMutating: isDeleting } = useProjectMutation(
    evalId ? `/evals/${evalId}` : null,
    fetcher.delete,
    {
      onSuccess: () => mutate(undefined, { revalidate: false }),
    },
  );

  return {
    eval: data,
    isLoading,
    updateEval,
    isUpdating,
    deleteEval,
    isDeleting,
    mutate,
  };
}

/* ────────────────────────────────────────────────────────────
   3. useEvalCriteria – list + create (per eval)
   ──────────────────────────────────────────────────────────── */

export function useEvalCriteria(evalId?: string) {
  // criteria are returned alongside the eval details,
  // but it can be handy to have a dedicated list endpoint
  const { data, isLoading, mutate } = useProjectSWR(
    evalId ? `/evals/${evalId}/criteria` : null,
  );

  const { trigger: createCriterion, isMutating: isCreating } =
    useProjectMutation(`/evals/criteria`, fetcher.post, {
      onSuccess: () => mutate(),
      optimisticData: (currentData, newData) =>
        currentData ? [...currentData, newData] : [newData],
    });

  return {
    criteria: data,
    isLoading,
    createCriterion,
    isCreating,
    mutate,
  };
}

/* ────────────────────────────────────────────────────────────
   4. useEvalResults – list (read-only)
   ──────────────────────────────────────────────────────────── */

export function useEvalResults(evalId?: string) {
  const { data, isLoading, mutate } = useProjectSWR(
    evalId ? `/evals/${evalId}/results` : null,
  );

  return {
    results: data,
    isLoading,
    mutate,
  };
}

export function useRunEval() {
  const { trigger, isMutating } = useProjectMutation(
    (id: string) => `/evals/${id}/run`,
    fetcher.post,
  );
  return { runEval: trigger, isRunning: isMutating };
}
