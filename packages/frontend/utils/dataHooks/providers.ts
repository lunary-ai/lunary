import { useProjectSWR, useProjectMutation } from ".";
import { fetcher } from "../fetcher";

/**
 * Hook to fetch and create Azure providers.
 */
export function useProviders() {
  const { data, isLoading, mutate } = useProjectSWR(`/providers`);

  const { trigger: createProvider, isMutating: isCreating } =
    useProjectMutation(`/providers`, fetcher.post, {
      onSuccess: () => mutate(),
      optimisticData: (currentData, newData) =>
        currentData ? [...currentData, newData] : [newData],
    });

  return {
    providers: data,
    isLoading,
    createProvider,
    isCreating,
    mutate,
  };
}

/**
 * Hook to fetch and create custom models for a specific provider.
 *
 * @param {number|string} providerId - The ID of the provider.
 */
export function useProviderModels(providerId) {
  // Only fetch if providerId is defined
  const { data, isLoading, mutate } = useProjectSWR(
    providerId ? `/providers/${providerId}/models` : null,
  );

  const { trigger: createModel, isMutating: isCreating } = useProjectMutation(
    `/providers/model`,
    fetcher.post,
    {
      onSuccess: () => mutate(),
      optimisticData: (currentData, newData) =>
        currentData ? [newData, ...currentData] : [newData],
    },
  );

  return {
    models: data,
    isLoading,
    createModel,
    isCreating,
    mutate,
  };
}

/**
 * Hook to fetch and create models for all providers for the project.
 */
export function useAllProviderModels() {
  const { data, isLoading, mutate } = useProjectSWR(`/providers/models`);

  const { trigger: createModel, isMutating: isCreating } = useProjectMutation(
    `/providers/models`,
    fetcher.post,
    {
      onSuccess: () => mutate(),
      optimisticData: (currentData, newData) =>
        currentData ? [...currentData, newData] : [newData],
    },
  );

  return {
    customModels: data,
    isLoading,
    createModel,
    isCreating,
    mutate,
  };
}
