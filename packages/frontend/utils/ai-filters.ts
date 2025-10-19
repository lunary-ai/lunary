import { useCallback, useContext, useRef, useState } from "react";
import type { CheckLogic } from "shared";
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
  "Latency is > 1s",
  "Model is from OpenAI",
  "Output is not in english",
];

export const DASHBOARD_AI_FILTER_EXAMPLES = [
  "Contains errors",
  "Model is gpt-5",
  "Has negative feedback",
];

export const DEFAULT_AI_FILTER_EXAMPLES = [
  "Runs with thumbs down",
  "Requests tagged billing this week",
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

  const [isMutating, setIsMutating] = useState(false);
  const pendingRequestsRef = useRef(0);

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

      const url = generateKey("/filters/natural-language", resolvedProjectId);
      if (!url) {
        throw new Error("Unable to resolve project for AI filter request.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const wasIdle = pendingRequestsRef.current === 0;
      pendingRequestsRef.current += 1;
      if (wasIdle) {
        setIsMutating(true);
      }

      try {
        const response = await fetcher.post(url, {
          arg: payload,
          signal: controller.signal,
        });

        return parseNaturalLanguageResponse(response);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("AI filter request timed out. Please try again.");
        }

        if (error instanceof Error) {
          throw error;
        }

        throw new Error("We couldn't convert your request. Try rephrasing it.");
      } finally {
        clearTimeout(timeoutId);
        pendingRequestsRef.current = Math.max(
          pendingRequestsRef.current - 1,
          0,
        );
        if (pendingRequestsRef.current === 0) {
          setIsMutating(false);
        }
      }
    },
    [resolvedProjectId],
  );

  return { run, isMutating };
}
