import { CheckLogic } from "shared";
import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";

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

export function useEvaluators() {
  const { data, isLoading, mutate } = useProjectSWR(`/evaluators`);
  const { trigger: insertEvaluatorMutation } = useProjectMutation(
    `/evaluators`,
    fetcher.post,
  );

  async function insertEvaluator(data: CreateEvaluatorData) {
    insertEvaluatorMutation(data);
  }

  return {
    evaluators: data,
    mutate,
    isLoading,
    insertEvaluator,
  };
}

export function useEvaluator(id: string, initialData?: any) {
  const { mutate: mutateEvaluators } = useEvaluators();

  const { data, isLoading, mutate } = useProjectSWR(id && `/evaluators/${id}`, {
    fallbackData: initialData,
  });

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
