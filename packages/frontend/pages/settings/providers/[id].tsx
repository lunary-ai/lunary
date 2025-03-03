import { useProviderConfig } from "@/utils/dataHooks/provider-configs";
import {
  Box,
  Button,
  Container,
  Group,
  PasswordInput,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { z } from "zod";

export default function ProviderSettings() {
  const router = useRouter();
  const configId = z.string().parse(router.query.id);
  const { config, metadata, update, isLoading } = useProviderConfig(configId);
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [resourceName, setResourceName] = useState();

  useEffect(() => {
    if (!config) return;
    if (config.apiKey) {
      setApiKey(config.apiKey);
    }
    if (config.models) {
      setModels(config.models);
    }
    // Only update resourceName if providerName is azure_openai
    if (
      router.query.providerName === "azure_openai" &&
      config.extraConfig.resourceName
    ) {
      setResourceName(config.extraConfig.resourceName);
    }
  }, [config, router.query.providerName]);

  async function handleSave() {
    try {
      await update({
        id: configId,
        apiKey,
        providerName: router.query.providerName,
        models,
        extraConfig: resourceName ? { resourceName } : null,
      });

      notifications.show({
        title: "Success",
        message: "Your API key has been saved",
      });
    } catch (error) {
      console.error("Failed to update API key:", error);
    }
  }

  async function handleSaveModels() {
    try {
      await update({
        id: configId,
        apiKey,
        providerName: router.query.providerName,
        models,
        extraConfig: resourceName ? { resourceName } : null,
      });

      notifications.show({
        title: "Success",
        message: "Your models have been saved",
      });
    } catch (error) {
      console.error("Failed to update models:", error);
    }
  }

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Container size="md" my="xl">
      <Title order={1} mb="xl">
        {metadata?.displayName} Settings
      </Title>
      <Stack>
        <Group align="end" justify="space-between">
          <PasswordInput
            type="text"
            label="Api Key"
            placeholder="Your API Key"
            value={apiKey}
            onChange={(event) => setApiKey(event.currentTarget.value)}
            w="70%"
          />
          <Button w="28%" onClick={handleSave}>
            Save Key
          </Button>
        </Group>
        {router.query.providerName === "azure_openai" && (
          <TextInput
            label="Resource Name"
            placeholder="Your resource name"
            value={resourceName}
            onChange={(event) => setResourceName(event.currentTarget.value)}
          />
        )}
        <TagsInput
          label="Please enter your model list"
          data={[]}
          value={models}
          onChange={setModels}
        />
        <Button onClick={handleSaveModels}>Save</Button>
      </Stack>
    </Container>
  );
}
