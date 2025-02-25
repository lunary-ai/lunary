import React from "react";
import {
  Card,
  Image,
  Text,
  Button,
  rem,
  Paper,
  Group,
  Stack,
  Title,
  Tooltip,
  Anchor,
  ButtonProps,
  ElementProps,
} from "@mantine/core";
import { ConfiguredProvider, ProviderMetadata } from "shared";
import classes from "./ProviderCard.module.css";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

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
        />
      </Stack>
    </Paper>
  );
}

function ButtonConfigure({
  disabled,
  providerConfigId,
}: {
  disabled?: boolean;
  providerConfigId: string;
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
      href={`/settings/providers/${providerConfigId}`}
    >
      Configure
    </Button>
  );
}
