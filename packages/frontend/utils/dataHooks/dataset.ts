import { useCallback, useContext, useMemo, useState } from "react";
import { ProjectContext } from "@/utils/context";
import { fetcher } from "@/utils/fetcher";
import {
  generateKey,
  useProjectMutation,
  useProjectSWR,
} from "./core";

function normalizeEvaluatorConfigs(
  source?: Record<string, DatasetEvaluatorConfig> | null,
): Record<number, DatasetEvaluatorConfig> | undefined {
  if (!source) return undefined;
  const result: Record<number, DatasetEvaluatorConfig> = {};
  Object.entries(source).forEach(([key, value]) => {
    const slot = Number(key);
    if (!Number.isNaN(slot)) {
      result[slot] = value;
    }
  });
  return result;
}

function normalizeDataset<T extends DatasetV2 | DatasetV2WithItems | null>(
  dataset: T,
): T {
  if (!dataset) return dataset;
  const normalized = {
    ...dataset,
    evaluatorConfigs: normalizeEvaluatorConfigs(dataset.evaluatorConfigs),
  } as any;
  return normalized;
}

export interface DatasetV2 {
  id: string;
  projectId: string;
  ownerId: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  itemCount?: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersionId?: string | null;
  currentVersionNumber?: number;
  currentVersionCreatedAt?: string | null;
  currentVersionCreatedBy?: string | null;
  currentVersionRestoredFromVersionId?: string | null;
  evaluatorSlot1Id?: string | null;
  evaluatorSlot2Id?: string | null;
  evaluatorSlot3Id?: string | null;
  evaluatorSlot4Id?: string | null;
  evaluatorSlot5Id?: string | null;
  evaluatorConfigs?: Record<number, DatasetEvaluatorConfig>;
}

export interface DatasetV2Item {
  id: string;
  datasetId: string;
  input: string;
  groundTruth: string | null;
  output: string | null;
  createdAt: string;
  updatedAt: string;
  evaluatorResult1?: unknown | null;
  evaluatorResult2?: unknown | null;
  evaluatorResult3?: unknown | null;
  evaluatorResult4?: unknown | null;
  evaluatorResult5?: unknown | null;
}

export type DatasetEvaluatorConfig =
  | {
      type: "model-labeler";
      passLabels: string[];
    }
  | {
      type: "model-scorer";
      threshold: number;
    };

export interface DatasetV2WithItems extends DatasetV2 {
  items: DatasetV2Item[];
}

export interface DatasetV2Version {
  id: string;
  datasetId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string | null;
  restoredFromVersionId: string | null;
  name: string | null;
  description: string | null;
  itemCount: number;
}

export interface DatasetV2VersionItem {
  id: string;
  versionId: string;
  datasetId: string;
  itemIndex: number;
  input: string;
  groundTruth: string | null;
  output: string | null;
  sourceItemId: string | null;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  evaluatorResult1?: unknown | null;
  evaluatorResult2?: unknown | null;
  evaluatorResult3?: unknown | null;
  evaluatorResult4?: unknown | null;
  evaluatorResult5?: unknown | null;
}

export interface DatasetV2Input {
  name: string;
  description?: string | null;
}

export interface DatasetV2ItemInput {
  input?: string;
  groundTruth?: string | null;
  output?: string | null;
}

export interface DatasetImportPayload {
  format: "csv" | "jsonl";
  content: string;
}

export interface DatasetGeneratePayload {
  model?: string;
  instructions?: string | null;
  input?: string;
}

type DatasetMutationCallbacks = {
  onUpdated?: (dataset: DatasetV2) => void;
  onDeleted?: () => void;
  onDuplicated?: (dataset: DatasetV2) => void;
};

export type DatasetSort = "newest" | "alphabetical" | "items" | "updated";

export interface DatasetListOptions {
  search?: string;
  sort?: DatasetSort;
}

export function useDatasetsV2(options: DatasetListOptions = {}) {
  const { search, sort = "newest" } = options;

  const query = new URLSearchParams();
  if (search?.trim()) {
    query.set("search", search.trim());
  }
  if (sort) {
    query.set("sort", sort);
  }
  const queryString = query.toString();
  const key = () =>
    `/datasets-v2${queryString ? `?${queryString}` : ""}`;

  const {
    data: rawData,
    isLoading,
    isValidating,
    mutate,
    error,
  } = useProjectSWR<DatasetV2[]>(key);

  const { projectId } = useContext(ProjectContext);

  const { trigger: createDataset, isMutating: isCreating } = useProjectMutation(
    `/datasets-v2`,
    fetcher.post,
  );

  const duplicateDataset = useCallback(
    async (datasetId: string) => {
      if (!projectId) return null;
      const url = generateKey(
        `/datasets-v2/${datasetId}/duplicate`,
        projectId,
      );
      if (!url) return null;

      const duplicated = await fetcher.post(url, { arg: {} });
      await mutate();
      return duplicated;
    },
    [projectId, mutate],
  );

  const importDatasetItems = useCallback(
    async (
      datasetId: string,
      payload: { format: "csv" | "jsonl"; content: string },
    ) => {
      if (!projectId) return null;
      const url = generateKey(
        `/datasets-v2/${datasetId}/import`,
        projectId,
      );
      if (!url) return null;

      const result = await fetcher.post(url, { arg: payload });
      await mutate();
      return result;
    },
    [projectId, mutate],
  );

  const datasets = useMemo(
    () => (rawData ?? []).map((dataset) => normalizeDataset(dataset)),
    [rawData],
  );

  return {
    datasets,
    isLoading,
    isValidating,
    mutate,
    error,
    createDataset,
    isCreating,
    duplicateDataset,
    importDatasetItems,
  };
}

export function useDatasetV2Mutations(
  datasetId?: string,
  callbacks: DatasetMutationCallbacks = {},
) {
  const { onUpdated, onDeleted, onDuplicated } = callbacks;

  const { trigger: updateDataset, isMutating: isUpdating } =
    useProjectMutation(datasetId ? `/datasets-v2/${datasetId}` : null, fetcher.patch, {
      onSuccess(data) {
        if (data) {
          onUpdated?.(data);
        }
      },
    });

  const { trigger: deleteDataset, isMutating: isDeleting } =
    useProjectMutation(datasetId ? `/datasets-v2/${datasetId}` : null, fetcher.delete, {
      revalidate: false,
      onSuccess() {
        onDeleted?.();
      },
    });

  const { trigger: duplicateDataset, isMutating: isDuplicating } =
    useProjectMutation(
      datasetId ? `/datasets-v2/${datasetId}/duplicate` : null,
      fetcher.post,
      {
        onSuccess(data) {
          if (data) {
            onDuplicated?.(data);
          }
        },
      },
    );

  return {
    updateDataset,
    deleteDataset,
    duplicateDataset,
    isUpdating,
    isDeleting,
    isDuplicating,
  };
}

export function useDatasetV2(datasetId?: string) {
  const { projectId } = useContext(ProjectContext);

  const {
    data: rawDataset,
    isLoading,
    isValidating,
    mutate,
    error,
  } = useProjectSWR<DatasetV2WithItems>(
    datasetId ? `/datasets-v2/${datasetId}` : null,
  );

  const dataset = useMemo(
    () => (rawDataset ? normalizeDataset(rawDataset) : rawDataset),
    [rawDataset],
  );

  const { trigger: updateDataset, isMutating: isUpdating } =
    useProjectMutation(datasetId ? `/datasets-v2/${datasetId}` : null, fetcher.patch, {
      onSuccess(data) {
        if (data) {
          mutate(
            (current) =>
              current
                ? {
                    ...current,
                    ...data,
                  }
                : current,
            { revalidate: false },
          );
        }
      },
    });

  const { trigger: deleteDataset, isMutating: isDeleting } =
    useProjectMutation(datasetId ? `/datasets-v2/${datasetId}` : null, fetcher.delete, {
      revalidate: false,
    });

  const { trigger: createItem, isMutating: isCreatingItem } =
    useProjectMutation(
      datasetId ? `/datasets-v2/${datasetId}/items?skipVersion=true` : null,
      fetcher.post,
      {
        onSuccess(item) {
          if (item) {
            mutate(
              (current) =>
                current
                  ? {
                      ...current,
                      items: [...(current.items ?? []), item],
                    }
                  : current,
              { revalidate: false },
            );
          }
        },
      },
    );

  const updateItem = useCallback(
    async (itemId: string, payload: DatasetV2ItemInput) => {
      if (!datasetId || !projectId) {
        return;
      }

      const url = generateKey(
        `/datasets-v2/${datasetId}/items/${itemId}`,
        projectId,
        "skipVersion=true",
      );

      if (!url) {
        return;
      }

      const updated = await fetcher.patch(url, { arg: payload });

      mutate(
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === itemId ? { ...item, ...updated } : item,
                ),
              }
            : current,
        { revalidate: false },
      );

      return updated;
    },
    [datasetId, projectId, mutate],
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!datasetId || !projectId) {
        return;
      }

      const url = generateKey(
        `/datasets-v2/${datasetId}/items/${itemId}`,
        projectId,
        "skipVersion=true",
      );

      if (!url) {
        return;
      }

      await fetcher.delete(url);

      mutate(
        (current) =>
          current
            ? {
                ...current,
                items: current.items.filter((item) => item.id !== itemId),
              }
            : current,
        { revalidate: false },
      );
    },
    [datasetId, projectId, mutate],
  );

  const importItems = useCallback(
    async (payload: DatasetImportPayload) => {
      if (!datasetId || !projectId) {
        return null;
      }

      const url = generateKey(
        `/datasets-v2/${datasetId}/import`,
        projectId,
      );

      if (!url) {
        return null;
      }

      const result = await fetcher.post(url, { arg: payload });
      await mutate();
      return result;
    },
    [datasetId, projectId, mutate],
  );

  const generateOutput = useCallback(
    async (itemId: string, payload: DatasetGeneratePayload = {}) => {
      if (!datasetId || !projectId) {
        return null;
      }

      const url = generateKey(
        `/datasets-v2/${datasetId}/items/${itemId}/generate`,
        projectId,
      );

      if (!url) {
        return null;
      }

      return fetcher.post(url, { arg: payload });
    },
    [datasetId, projectId],
  );

  const addEvaluator = useCallback(
    async (evaluatorId: string, config?: DatasetEvaluatorConfig | null) => {
      if (!datasetId || !projectId) {
        return null;
      }

      const url = generateKey(
        `/datasets-v2/${datasetId}/evaluators`,
        projectId,
      );

      if (!url) {
        return null;
      }

      const updated = await fetcher.post(url, {
        arg: { evaluatorId, config: config ?? undefined },
      });

      if (updated) {
        const normalized = normalizeDataset(updated);
        mutate(
          (current) =>
            current
              ? {
                  ...current,
                  ...normalized,
                  items: current.items,
                }
              : normalized,
          { revalidate: false },
        );
      }

      return updated;
    },
    [datasetId, projectId, mutate],
  );

  const removeEvaluator = useCallback(
    async (slot: number) => {
      if (!datasetId || !projectId) {
        return null;
      }

      const url = generateKey(
        `/datasets-v2/${datasetId}/evaluators/${slot}`,
        projectId,
      );

      if (!url) {
        return null;
      }

      const updated = await fetcher.delete(url);

      if (updated) {
        const normalized = normalizeDataset(updated);
        mutate(normalized, { revalidate: false });
      }

      return updated;
    },
    [datasetId, projectId, mutate],
  );

  const runEvaluators = useCallback(async () => {
    if (!datasetId || !projectId) {
      return null;
    }

    const url = generateKey(
      `/datasets-v2/${datasetId}/evaluators/run`,
      projectId,
    );

    if (!url) {
      return null;
    }

    const response = await fetcher.post(url, { arg: {} });

    if (response?.dataset) {
      mutate(normalizeDataset(response.dataset), { revalidate: false });
    }

    return response;
  }, [datasetId, projectId, mutate]);

  return {
    dataset,
    isLoading,
    isValidating,
    error,
    mutate,
    updateDataset,
    deleteDataset,
    isUpdating,
    isDeleting,
    createItem,
    isCreatingItem,
    updateItem,
    deleteItem,
    importItems,
    generateOutput,
    addEvaluator,
    removeEvaluator,
    runEvaluators,
  };
}

export function useDatasetV2Versions(
  datasetId?: string,
  options: { limit?: number } = {},
) {
  const { limit = 50 } = options;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useProjectSWR<{ versions: DatasetV2Version[] }>(
    datasetId ? `/datasets-v2/${datasetId}/versions?limit=${limit}` : null,
  );

  return {
    versions: data?.versions ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function useDatasetV2Version(
  datasetId?: string,
  versionId?: string,
) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useProjectSWR<{
    version: DatasetV2Version;
    items: DatasetV2VersionItem[];
  }>(datasetId && versionId ? `/datasets-v2/${datasetId}/versions/${versionId}` : null);

  return {
    version: data?.version ?? null,
    items: data?.items ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function useDatasetV2VersionMutations(datasetId?: string) {
  const { projectId } = useContext(ProjectContext);

  const {
    trigger: triggerCreateVersion,
    isMutating: isCreatingVersion,
  } = useProjectMutation(
    datasetId ? `/datasets-v2/${datasetId}/versions` : null,
    fetcher.post,
  );

  const createVersion = useCallback(async () => {
    if (!datasetId) return null;
    return triggerCreateVersion({});
  }, [datasetId, triggerCreateVersion]);

  const [isRestoring, setIsRestoring] = useState(false);

  const restoreVersion = useCallback(
    async (versionId: string) => {
      if (!datasetId || !projectId) {
        return null;
      }

      const url = generateKey(
        `/datasets-v2/${datasetId}/versions/${versionId}/restore`,
        projectId,
      );

      if (!url) {
        return null;
      }

      setIsRestoring(true);
      try {
        return await fetcher.post(url, { arg: {} });
      } finally {
        setIsRestoring(false);
      }
    },
    [datasetId, projectId],
  );

  return {
    createVersion,
    isCreatingVersion,
    restoreVersion,
    isRestoring,
  };
}
