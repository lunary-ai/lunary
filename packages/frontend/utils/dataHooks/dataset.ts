import { useCallback, useContext } from "react";
import { ProjectContext } from "@/utils/context";
import { fetcher } from "@/utils/fetcher";
import {
  generateKey,
  useProjectMutation,
  useProjectSWR,
} from "./core";

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
}

export interface DatasetV2Item {
  id: string;
  datasetId: string;
  input: string;
  groundTruth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetV2WithItems extends DatasetV2 {
  items: DatasetV2Item[];
}

export interface DatasetV2Input {
  name: string;
  description?: string | null;
}

export interface DatasetV2ItemInput {
  input?: string;
  groundTruth?: string | null;
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
    data,
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

  return {
    datasets: data ?? [],
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
    data: dataset,
    isLoading,
    isValidating,
    mutate,
    error,
  } = useProjectSWR<DatasetV2WithItems>(
    datasetId ? `/datasets-v2/${datasetId}` : null,
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
      datasetId ? `/datasets-v2/${datasetId}/items` : null,
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
  };
}
