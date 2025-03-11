import { ProviderCard } from "@/components/providers/ProviderCard";
import { useProviderConfigs } from "@/utils/dataHooks/provider-configs";
import { Container, SimpleGrid, Text, Title } from "@mantine/core";

export default function ProvidersManager() {
  const { configuredProviders, isLoading } = useProviderConfigs();

  return (
    <Container size="md" my="xl">
      <Title order={1}>LLM Providers</Title>
      <Text>
        Set up and manage your own LLM providers for use in the Prompt
        Playground.
      </Text>

      <SimpleGrid cols={3} spacing="lg" my="lg">
        {configuredProviders.map((configuredProvider) => (
          <ProviderCard
            key={configuredProvider.metadata.name}
            configuredProvider={configuredProvider}
          />
        ))}
      </SimpleGrid>
    </Container>
  );
}
