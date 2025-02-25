import {
  ConfiguredProvider,
  CustomModel,
  ProviderConfig,
  ProviderMetadata,
  PROVIDERS,
} from "shared";
import { useProjectSWR, useProjectMutation } from ".";
import { fetcher } from "../fetcher";

function buildConfiguredProviders(
  providers: ProviderMetadata[],
  configs: ProviderConfig[],
): ConfiguredProvider[] {
  return providers.map((provider) => ({
    metadata: provider,
    config: configs.find((config) => config.providerName === provider.name),
  }));
}

export function useProviderConfigs() {
  const { data, isLoading, mutate } =
    useProjectSWR<ProviderConfig[]>(`/provider-configs`);
  const providerConfigs = data || [];
  const configuredProviders = buildConfiguredProviders(
    PROVIDERS,
    providerConfigs,
  );

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/provider-configs`,
    fetcher.post,
    {
      onSuccess(newConfig) {
        mutate([...providerConfigs, newConfig], false);
      },
    },
  );

  return {
    configuredProviders,
    isLoading,
    mutate,
    insert,
    isInserting,
  };
}

export function useProviderConfig(
  id: string | null,
  initialData?: ProviderConfig,
) {
  const { mutate: mutateConfigs } = useProviderConfigs();

  const { data, isLoading, mutate } = useProjectSWR<ProviderConfig>(
    id ? `/provider-configs/${id}` : null,
    { fallbackData: initialData },
  );

  const metadata: ProviderMetadata | {} = data
    ? (PROVIDERS.find(
        (provider) => provider.name === data.providerName,
      ) as ProviderMetadata)
    : {};

  const { trigger: update } = useProjectMutation(
    id ? `/provider-configs/${id}` : null,
    fetcher.patch,
    {
      onSuccess(updatedConfig) {
        mutate(updatedConfig, false);
        mutateConfigs();
      },
    },
  );

  const { trigger: remove } = useProjectMutation(
    id ? `/provider-configs/${id}` : null,
    fetcher.delete,
    {
      revalidate: false,
      onSuccess() {
        mutateConfigs();
      },
    },
  );

  return {
    config: data,
    metadata,
    isLoading,
    mutate,
    update,
    remove,
  };
}

export function useCustomModels() {
  const { data, isLoading, mutate } = useProjectSWR<CustomModel[]>(
    `/provider-configs/models`,
  );

  return {
    customModels: data || [],
    isLoading,
    mutate,
  };
}
