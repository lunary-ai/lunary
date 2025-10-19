import { notifications } from "@mantine/notifications";
import { useCallback, useMemo, useState } from "react";

import {
  useNaturalLanguageFilters,
  type NaturalLanguageFilterResult,
  type RunType,
} from "@/utils/ai-filters";
import analytics from "@/utils/analytics";
import errorHandler from "@/utils/errors";

type UseAiFilterOptions = {
  projectId?: string | null;
};

type ApplyAiFilterOptions = {
  key?: string;
  type?: RunType;
  onSuccess?: (result: NaturalLanguageFilterResult) => void;
  onError?: (error: Error) => void;
  notifyOnError?: boolean;
  trackEvent?: string;
  trackPayload?: (result: NaturalLanguageFilterResult) => Record<string, any>;
};

const DEFAULT_KEY = "__default__";

export function useAiFilter({ projectId }: UseAiFilterOptions = {}) {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const { run } = useNaturalLanguageFilters(projectId);

  const applyAiFilter = useCallback(
    async (request: string, options: ApplyAiFilterOptions = {}) => {
      const trimmed = request.trim();
      if (!trimmed) {
        const error = new Error("Please describe what you need.");
        options.onError?.(error);
        throw error;
      }

      const key = options.key ?? DEFAULT_KEY;
      setLoadingMap((prev) => ({ ...prev, [key]: true }));

      try {
        const result = await run(trimmed, {
          type: options.type,
        });

        if (options.trackEvent) {
          analytics.track(options.trackEvent, {
            query: trimmed,
            type: options.type ?? result.inferredType,
            ...(options.trackPayload ? options.trackPayload(result) : {}),
          });
        }

        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("We couldn't convert your request. Try rephrasing it.");

        errorHandler(error);

        if (options.notifyOnError ?? true) {
          notifications.show({
            title: "AI filter failed",
            message: error.message,
            color: "red",
          });
        }

        options.onError?.(error);
        throw error;
      } finally {
        setLoadingMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [projectId, run],
  );

  const isAiFilterLoading = useCallback(
    (key?: string) => {
      if (key) {
        return Boolean(loadingMap[key ?? DEFAULT_KEY]);
      }
      return Object.keys(loadingMap).length > 0;
    },
    [loadingMap],
  );

  const loadingKeys = useMemo(() => loadingMap, [loadingMap]);

  return {
    applyAiFilter,
    isAiFilterLoading,
    loadingKeys,
  };
}
