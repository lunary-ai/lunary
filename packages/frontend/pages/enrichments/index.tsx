import Empty from "@/components/layout/Empty";
import Paywall from "@/components/layout/Paywall";
import { useOrg } from "@/utils/dataHooks";
import { useEnricher, useEnrichers } from "@/utils/dataHooks/evaluators";
import EVALUATOR_TYPES from "@/utils/evaluators";
import { slugify } from "@/utils/format";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconActivityHeartbeat,
  IconDotsVertical,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";

function EnricherCard({ id, initialData }) {
  const { enricher, delete: deleteEnricher } = useEnricher(id, initialData);

  const { description, icon: Icon } = EVALUATOR_TYPES[enricher.type];

  return (
    <Card p="lg" withBorder>
      <Group justify="space-between">
        <Stack>
          <Group>
            <Icon size={24} />
            <Title order={3} size={16}>
              {enricher.name}
            </Title>
            <Text c="dimmed" fw="semibold" size="sm">
              {description}
            </Text>
          </Group>
          <Group>
            <Text c="dimmed" fw="semibold" size="sm">
              {slugify(enricher.name)}
            </Text>
          </Group>
        </Stack>

        <Menu>
          <Menu.Target>
            <ActionIcon variant="transparent">
              <IconDotsVertical color="gray" />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            {/* <Menu.Item
              leftSection={
                <IconPencil color="blue" width="15px" height="15px" />
              }
              disabled
              onClick={() => {}}
            >
              Update
            </Menu.Item> */}
            <Menu.Item
              leftSection={<IconTrash color="red" width="15px" height="15px" />}
              onClick={() => deleteEnricher()}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}

const FEATURE_LIST = [
  "Automatic data labelling and scoring on production data, in real time",
  "Sentiment analysis, topic recognition, PII detection, and more",
  "Define custom LLM-based enrichers",
];

export default function Enrichments() {
  const router = useRouter();
  const { enrichers, isLoading } = useEnrichers();
  const { org } = useOrg();

  if (isLoading) {
    return <Loader />;
  }

  if (org.plan === "free") {
    return (
      <Paywall
        plan="enterprise"
        feature="Data Enrichment"
        Icon={IconActivityHeartbeat}
        p="xl"
        enabled={!org.license.realtimeEvalsEnabled}
        description="Enrich your production data in real-time."
        list={FEATURE_LIST}
      >
        <Container>
          <Stack>
            <Group align="center" justify="space-between">
              <Group align="center">
                <Title>Data Enrichments</Title>
                <Badge variant="teal" color="violet">
                  Enterprise
                </Badge>
              </Group>

              <Group>
                <Button variant="default" leftSection={<IconPlus size={12} />}>
                  New
                </Button>
              </Group>
            </Group>

            <Text size="lg" mb="md">
              Gain insight from your production data in real time, by adding
              additional information, such as sentiment analysis, topic
              recognition, and more.
            </Text>
          </Stack>
        </Container>
      </Paywall>
    );
  }

  return (
    <Empty
      enable={!enrichers.length}
      Icon={IconActivityHeartbeat}
      title="Data Enrichment"
      buttonLabel="Create First Enricher"
      onClick={() => router.push("/enrichments/new")}
      description="Enrich your production data in real-time."
    >
      <Container>
        <Stack>
          <Group align="center" justify="space-between">
            <Group align="center">
              <Title>Data Enrichment</Title>
              <Badge variant="light" color="blue">
                Beta
              </Badge>
            </Group>

            <Button
              leftSection={<IconPlus size={12} />}
              variant="default"
              onClick={() => router.push("/enrichments/new")}
            >
              Add Data Enricher
            </Button>
          </Group>

          <Text size="xl" mb="md">
            Enrich your production data in real-time.
          </Text>

          <Stack gap="xl">
            {enrichers?.map((enricher) => (
              <EnricherCard
                key={enricher.id}
                id={enricher.id}
                initialData={enricher}
              />
            ))}
          </Stack>
        </Stack>
      </Container>
    </Empty>
  );
}
