import { useCallback, useContext } from "react";
import type { CheckLogic } from "shared";
import useSWRMutation from "swr/mutation";
import { ProjectContext } from "./context";
import { generateKey } from "./dataHooks";
import { fetcher } from "./fetcher";

export type RunType = "llm" | "trace" | "thread";

export type NaturalLanguageFilterOptions = {
  type?: RunType;
};

export const DATA_RULES_AI_FILTER_EXAMPLES = [
  'Block events from user "test@acme.com"',
  "Block events that have metadata containsPii: true",
];

export const LOGS_AI_FILTER_EXAMPLES = [
  "Return all logs where latency is > 1s",
  "Model is from OpenAI",
  "Output is not in english and cost is high",
];

export const DASHBOARD_AI_FILTER_EXAMPLES = [
  "Data that contains errors",
  "Model is gpt-5",
  "Data with negative feedback",
];

export const DEFAULT_AI_FILTER_EXAMPLES = [
  "runs with thumbs down feedback",
  "requests tagged billing this week",
  "traces longer than 2 seconds",
];

export type NaturalLanguageFilterResult = {
  logic: CheckLogic;
  query?: string;
  debug?: Record<string, unknown>;
  inferredType?: RunType;
};

function parseNaturalLanguageResponse(
  response: any,
): NaturalLanguageFilterResult {
  if (!response || !Array.isArray(response.logic)) {
    throw new Error(
      "Unexpected response from natural language filters endpoint",
    );
  }

  const logic = response.logic as CheckLogic;

  const typeLeaf = Array.isArray(logic)
    ? (logic as unknown[]).find(
        (node: any) =>
          node &&
          typeof node === "object" &&
          node.id === "type" &&
          node.params &&
          typeof node.params.type === "string",
      )
    : undefined;

  const inferredType = typeLeaf?.params?.type as RunType | undefined;

  return {
    logic,
    query: response.query,
    debug: response.debug,
    inferredType,
  };
}

export function useNaturalLanguageFilters(projectIdOverride?: string | null) {
  const { projectId: contextProjectId } = useContext(ProjectContext);
  const resolvedProjectId = projectIdOverride ?? contextProjectId;

  const { trigger, isMutating } = useSWRMutation(
    () => generateKey("/filters/natural-language", resolvedProjectId),
    (url: string, { arg }: { arg: { text: string; type?: RunType } }) =>
      fetcher.post(url, { arg }),
  );

  const run = useCallback(
    async (
      text: string,
      options: NaturalLanguageFilterOptions = {},
    ): Promise<NaturalLanguageFilterResult> => {
      if (!resolvedProjectId) {
        throw new Error("Please select a project before using AI filter.");
      }

      const trimmed = text.trim();

      if (!trimmed) {
        throw new Error("Please provide a filter description.");
      }

      const payload: { text: string; type?: RunType } = { text: trimmed };

      if (options.type) {
        payload.type = options.type;
      }

      const response = await trigger(payload);

      return parseNaturalLanguageResponse(response);
    },
    [resolvedProjectId, trigger],
  );

  return { run, isMutating };
}
