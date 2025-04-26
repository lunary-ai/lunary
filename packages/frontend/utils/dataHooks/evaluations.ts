import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";

export function useEvaluations<T>() {
  const { data, isLoading, mutate } = useProjectSWR("/evaluations/v2");

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    "/evaluations/v2",
    fetcher.post,
  );

  return {
    evaluations: data || [],
    insert,
    isInserting,
    mutate,
    loading: isLoading,
  };
}
