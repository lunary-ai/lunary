import { useProviderConfig } from "@/utils/dataHooks/provider-configs";
import { Button, Container, Group, PasswordInput, Text } from "@mantine/core";
import { useRouter } from "next/router";
import { useState } from "react";
import { z } from "zod";

export default function ProviderSettings() {
  const router = useRouter();
  const configId = z.string().parse(router.query.id);
  const { config, isLoading } = useProviderConfig(configId);
  const [apiKey, setApiKey] = useState(config?.apiKey);

  return (
    <Container size="md" my="xl">
      <Text mb="xl">OpenAI Configuration</Text>

      <Group>
        <PasswordInput
          label="Api Key"
          placeholder="Your "
          value={apiKey}
          onChange={(event) => setApiKey(event.currentTarget.value)}
        />
        <Button>Save Key</Button>
      </Group>
    </Container>
  );
}
