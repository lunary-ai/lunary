import {
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import Link from "next/link";
import { ConfiguredProvider } from "shared";
import { v4 as uuidv4 } from "uuid";
import classes from "./ProviderCard.module.css";
import Image from "next/image";

export function ProviderCard({
  configuredProvider,
}: {
  configuredProvider: ConfiguredProvider;
}) {
  const { metadata, config } = configuredProvider;
  const configId = config?.id || uuidv4();

  return (
    <Paper withBorder bg="light" p="md" className={classes.card}>
      <Stack>
        <Group>
          <Image
            src={metadata.iconUrl}
            alt={metadata.name}
            width={32}
            height={32}
          />
          <Title order={3}>{metadata.displayName}</Title>
        </Group>

        <Text size="15px" lh="md">
          {metadata.description}
        </Text>

        <ButtonConfigure
          disabled={metadata.disabled}
          providerConfigId={configId}
          providerName={metadata.name}
        />
      </Stack>
    </Paper>
  );
}

function ButtonConfigure({
  disabled,
  providerConfigId,
  providerName,
}: {
  disabled?: boolean;
  providerConfigId: string;
  providerName: string;
}) {
  if (disabled) {
    return (
      <Tooltip label="Coming soon">
        <Button
          className={classes.button}
          data-disabled
          onClick={(event) => event.preventDefault()}
        >
          Configure
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      color="black"
      component={Link}
      href={{
        pathname: `/settings/providers/${providerConfigId}`,
        query: { providerName },
      }}
    >
      Configure
    </Button>
  );
}
