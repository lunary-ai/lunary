import { useMemo } from "react";
import { CheckLogic } from "shared";
import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";

// define Evaluator type
export interface Evaluator {
  id: string;
  type: string;
  name: string;
  kind?: "builtin" | "custom";
}

interface CreateEvaluatorData {
  ownerId?: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  mode: string;
  params: Record<string, any>;
  filters?: CheckLogic;
}

export function useEvaluators(options: { kind?: "builtin" | "custom" } = {}) {
  const { kind } = options;
  const endpoint =
    kind != null ? `/evaluators?kind=${encodeURIComponent(kind)}` : `/evaluators`;

  const { data, isLoading, mutate } = useProjectSWR<Evaluator[]>(endpoint as string);
  const { trigger: insertEvaluatorMutation } = useProjectMutation(
    `/evaluators`,
    fetcher.post,
  );
  async function insertEvaluator(data: CreateEvaluatorData) {
    insertEvaluatorMutation(data);
  }

  const evaluatorsList = useMemo(
    () =>
      (data ?? []).map((item) => ({
        ...item,
        kind: item.kind ?? "custom",
      })),
    [data],
  );

  return {
    evaluators: evaluatorsList as Evaluator[],
    mutate,
    isLoading,
    insertEvaluator,
  };
}

export function useEvaluator(id?: string, initialData?: any) {
  const { mutate: mutateEvaluators } = useEvaluators();

  const { data, isLoading, mutate } = useProjectSWR(
    id ? `/evaluators/${id}` : null,
    {
      fallbackData: initialData,
    },
  );

  const { trigger: updateEvaluatorMutation } = useProjectMutation(
    `/evaluators/${id}`,
    fetcher.patch,
  );

  const { trigger: deleteEvaluatorMutation } = useProjectMutation(
    `/evaluators/${id}`,
    fetcher.delete,
    {
      onSuccess() {
        mutateEvaluators((vals) => vals.filter((v) => v.id !== id));
      },
    },
  );

  return {
    evaluator: data,
    update: updateEvaluatorMutation,
    delete: deleteEvaluatorMutation,
    mutate,
    isLoading,
  };
}
