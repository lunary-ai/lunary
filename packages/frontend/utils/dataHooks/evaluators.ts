import { CheckLogic } from "shared";
import { useProjectMutation, useProjectSWR } from ".";
import EVALUATOR_TYPES from "../evaluators";
import { fetcher } from "../fetcher";

// define Evaluator type
export interface Evaluator {
  id: string;
  type: string;
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

export function useEvaluators() {
  const { data, isLoading, mutate } = useProjectSWR<Evaluator[]>(
    `/evaluators` as string,
  );
  const { trigger: insertEvaluatorMutation } = useProjectMutation(
    `/evaluators`,
    fetcher.post,
  );
  async function insertEvaluator(data: CreateEvaluatorData) {
    insertEvaluatorMutation(data);
  }

  return {
    evaluators:
      data?.map((evaluator) => ({
        ...evaluator,
        color: EVALUATOR_TYPES[evaluator.type].color,
        name: EVALUATOR_TYPES[evaluator.type].name,
        soon: EVALUATOR_TYPES[evaluator.type].soon,
        icon: EVALUATOR_TYPES[evaluator.type].icon,
      })) || ([] as Evaluator[]),
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
