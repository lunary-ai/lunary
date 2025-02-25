import {
  ConfiguredProvider,
  ProviderConfig,
  ProviderMetadata,
  PROVIDERS,
} from "shared";
import { useProjectSWR } from ".";

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

  const providersConfigs = data || [];

  const configuredProviders = buildConfiguredProviders(
    PROVIDERS,
    providersConfigs,
  );

  return {
    configuredProviders,
    isLoading,
    mutate,
  };
}

export function useProviderConfig(configId: string) {
  const { data, isLoading, mutate } = useProjectSWR<ProviderConfig>(
    `/provider-configs/${configId}`,
  );

  return {
    config: data,
    isLoading,
    mutate,
  };
}
