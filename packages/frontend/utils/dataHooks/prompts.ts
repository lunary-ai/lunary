import {
  Prompt,
  promptSchema,
  PromptVersion,
  promptVersionSchema,
} from "shared/schemas/prompt";
import { useProjectSWR } from ".";

export function usePrompts() {
  const { data, isLoading, mutate } = useProjectSWR<Prompt[]>(`/prompts`);
  const prompts = promptSchema.array().parse(data || []);

  return {
    prompts,
    isLoading,
    mutate,
  };
}

export function usePromptVersions(id: number | undefined) {
  const { data, isLoading, mutate } = useProjectSWR<PromptVersion>(
    id !== undefined && `/prompts/${id}/versions`,
  );

  const promptVersions = promptVersionSchema.array().parse(data || []);

  return {
    promptVersions,
    loading: isLoading,
    mutate,
  };
}
