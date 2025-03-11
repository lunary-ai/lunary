import { useProviderConfig } from "@/utils/dataHooks/provider-configs";
import {
  Button,
  Container,
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
  const [resourceName, setResourceName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    if (!config) return;
    if (config.apiKey) setApiKey(config.apiKey);
    if (config.models) setModels(config.models);
    if (
      router.query.providerName === "azure_openai" &&
      config.extraConfig?.resourceName
    ) {
      setResourceName(config.extraConfig.resourceName);
    }
    if (router.query.providerName === "amazon_bedrock" && config.extraConfig) {
      setAccessKeyId(config.extraConfig.accessKeyId || "");
      setSecretAccessKey(config.extraConfig.secretAccessKey || "");
      setRegion(config.extraConfig.region || "");
    }
  }, [config, router.query.providerName]);

  // Unified save function for all settings
  async function handleSave() {
    try {
      const extraConfig = {};
      if (router.query.providerName === "azure_openai") {
        extraConfig.resourceName = resourceName;
      } else if (router.query.providerName === "amazon_bedrock") {
        extraConfig.accessKeyId = accessKeyId;
        extraConfig.secretAccessKey = secretAccessKey;
        extraConfig.region = region;
      }

      await update({
        id: configId,
        apiKey: router.query.providerName !== "amazon_bedrock" ? apiKey : "",
        providerName: router.query.providerName,
        models,
        extraConfig: Object.keys(extraConfig).length > 0 ? extraConfig : null,
      });

      notifications.show({
        title: "Success",
        message: "Your settings have been saved",
      });
    } catch (error) {
      console.error("Failed to update settings:", error);
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
        {router.query.providerName !== "amazon_bedrock" && (
          <PasswordInput
            label="API Key"
            placeholder="Your API Key"
            value={apiKey}
            onChange={(event) => setApiKey(event.currentTarget.value)}
          />
        )}
        {router.query.providerName === "azure_openai" && (
          <TextInput
            label="Resource Name"
            placeholder="Your resource name"
            value={resourceName}
            onChange={(event) => setResourceName(event.currentTarget.value)}
          />
        )}
        {router.query.providerName === "amazon_bedrock" && (
          <Stack>
            <TextInput
              label="Access Key ID"
              placeholder="Your AWS Access Key ID"
              value={accessKeyId}
              onChange={(event) => setAccessKeyId(event.currentTarget.value)}
            />
            <PasswordInput
              label="Secret Access Key"
              placeholder="Your AWS Secret Access Key"
              value={secretAccessKey}
              onChange={(event) =>
                setSecretAccessKey(event.currentTarget.value)
              }
            />
            <TextInput
              label="Region"
              placeholder="Your AWS Region (e.g., us-east-1)"
              value={region}
              onChange={(event) => setRegion(event.currentTarget.value)}
            />
          </Stack>
        )}
        <TagsInput
          label="Custom Models IDs"
          data={[]}
          value={models}
          onChange={setModels}
        />
        <Button onClick={handleSave}>Save</Button>
      </Stack>
    </Container>
  );
}
