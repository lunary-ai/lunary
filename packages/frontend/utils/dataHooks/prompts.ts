import {
  Prompt,
  promptSchema,
  PromptVersion,
  promptVersionSchema,
} from "shared/schemas/prompt";
import { useProjectSWR } from ".";
import { z } from "zod";

export function usePrompts() {
  const { data, isLoading, mutate } = useProjectSWR<Prompt[]>(`/prompts`);
  const prompts = z.array(promptSchema).parse(data || []);

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

  const promptVersions = z.array(promptVersionSchema).parse(data || []);

  return {
    promptVersions,
    loading: isLoading,
    mutate,
  };
}
