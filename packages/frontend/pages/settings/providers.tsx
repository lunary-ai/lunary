import { useState } from "react";
import {
  Container,
  Title,
  TextInput,
  Button,
  Loader,
  Card,
  Group,
  List,
  Alert,
} from "@mantine/core";
import {
  useProviders,
  useProviderModels,
} from "../../utils/dataHooks/providers";

export default function ProvidersManager() {
  // Local state for managing selected provider and form inputs
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [newProviderApiKey, setNewProviderApiKey] = useState("");
  const [newProviderResourceName, setNewProviderResourceName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [error, setError] = useState("");

  // Fetch providers using our data hook
  const {
    providers,
    isLoading: providersLoading,
    createProvider,
    isCreating: isCreatingProvider,
  } = useProviders();

  // Fetch models for the selected provider (if one is selected)
  const {
    models,
    isLoading: modelsLoading,
    createModel,
    isCreating: isCreatingModel,
  } = useProviderModels(selectedProvider ? selectedProvider.id : null);

  // Handler for creating a new provider
  const handleCreateProvider = async () => {
    try {
      setError("");
      await createProvider({
        apiKey: newProviderApiKey,
        resourceName: newProviderResourceName,
      });
      setNewProviderApiKey("");
      setNewProviderResourceName("");
    } catch (err) {
      console.error(err);
      setError("Failed to create provider");
    }
  };

  // Handler for creating a new model
  const handleCreateModel = async () => {
    if (!selectedProvider) return;
    try {
      setError("");
      await createModel({
        name: newModelName,
        providerId: selectedProvider.id,
      });
      setNewModelName("");
    } catch (err) {
      console.error(err);
      setError("Failed to create model");
    }
  };

  return (
    <Container size="md" my="xl">
      <Title ta="center" mb="lg">
        Azure Providers Manager
      </Title>

      {error && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      {/* Show providers list and provider creation form when no provider is selected */}
      {!selectedProvider && (
        <>
          <Title order={3} mb="sm">
            Add New Provider
          </Title>
          <Group mb="md">
            <TextInput
              label="API Key"
              placeholder="Enter API Key"
              value={newProviderApiKey}
              onChange={(e) => setNewProviderApiKey(e.target.value)}
              style={{ flex: 1 }}
            />
            <TextInput
              label="Resource Name"
              placeholder="Enter Resource Name"
              value={newProviderResourceName}
              onChange={(e) => setNewProviderResourceName(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button onClick={handleCreateProvider} loading={isCreatingProvider}>
              Create Provider
            </Button>
          </Group>

          <Title order={3} mb="sm">
            Existing Providers
          </Title>
          {providersLoading ? (
            <Loader />
          ) : (
            <List spacing="sm" mb="lg">
              {providers && providers.length > 0 ? (
                providers.map((provider) => (
                  <Card shadow="sm" padding="sm" withBorder>
                    <Group position="apart">
                      <div>
                        <div>
                          <strong>Resource Name:</strong>{" "}
                          {provider.resourceName}
                        </div>
                      </div>
                      <Button
                        size="xs"
                        onClick={() => setSelectedProvider(provider)}
                      >
                        View Models
                      </Button>
                    </Group>
                  </Card>
                ))
              ) : (
                <div>No providers found.</div>
              )}
            </List>
          )}
        </>
      )}

      {/* When a provider is selected, show its models and a form to create a new model */}
      {selectedProvider && (
        <>
          <Button
            variant="subtle"
            mb="md"
            onClick={() => setSelectedProvider(null)}
          >
            &lt; Back to Providers
          </Button>
          <Title order={3} mb="sm">
            Models for Provider: {selectedProvider.resource_name}
          </Title>
          {modelsLoading ? (
            <Loader />
          ) : (
            <List spacing="sm" mb="lg">
              {models && models.length > 0 ? (
                models.map((model) => (
                  <Card shadow="sm" padding="sm" withBorder>
                    <div>
                      <strong>Name:</strong> {model.name}
                    </div>
                    <div>
                      <strong>Provider:</strong> azure
                    </div>
                  </Card>
                ))
              ) : (
                <div>No models found.</div>
              )}
            </List>
          )}
          <Title order={4} mb="sm">
            Add New Model
          </Title>
          <Group mb="md">
            <TextInput
              label="Model Name"
              placeholder="Enter model name"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button onClick={handleCreateModel} loading={isCreatingModel}>
              Create Model
            </Button>
          </Group>
        </>
      )}
    </Container>
  );
}
