import Empty from "@/components/layout/Empty";
import Paywall from "@/components/layout/Paywall";
import { useOrg } from "@/utils/dataHooks";
import { useEvaluator, useEvaluators } from "@/utils/dataHooks/evaluators";
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

function EvaluatorCard({ id, initialData }) {
  const router = useRouter();
  const { evaluator, delete: deleteEvaluator } = useEvaluator(id, initialData);

  const evalMeta = EVALUATOR_TYPES[evaluator?.type];

  if (!evalMeta) return null;

  const { description, icon: Icon } = evalMeta;

  return (
    <Card p="lg" withBorder>
      <Group justify="space-between">
        <Stack>
          <Group>
            <Icon size={24} />
            <Title order={3} size={16}>
              {evaluator?.name}
            </Title>
          </Group>
          <Group>
            <Text c="dimmed" fw="semibold" size="sm">
              {description}
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
            <Menu.Item
              leftSection={<IconTrash color="red" width="15px" height="15px" />}
              onClick={() => deleteEvaluator()}
            >
              Delete
            </Menu.Item>
            <Menu.Item
              leftSection={
                <IconPencil color="gray" width="15px" height="15px" />
              }
              onClick={() => router.push(`/evaluators/new?id=${id}`)}
            >
              Edit
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}

const FEATURE_LIST = [
  "Automatic data labelling and scoring on production data, in real time",
  "User Sentiment analysis, topic recognition, PII detection, and more",
  "Define custom LLM-based enrichers",
];

export default function EvaluatorsPage() {
  const router = useRouter();
  const { evaluators, isLoading } = useEvaluators();
  const { org } = useOrg();

  if (isLoading) {
    return <Loader />;
  }

  if (org.plan === "free") {
    return (
      <Paywall
        plan="enterprise"
        feature="Evaluators"
        Icon={IconActivityHeartbeat}
        p="xl"
        enabled={!org.license.realtimeEvalsEnabled}
        description="Evaluate your production data in realtime or batch."
        list={FEATURE_LIST}
      >
        <Container>
          <Stack>
            <Group align="center" justify="space-between">
              <Group align="center">
                <Title>Evaluators</Title>
                <Badge variant="teal" color="violet">
                  Enterprise
                </Badge>
              </Group>

              <Group>
                <Button
                  variant="default"
                  leftSection={<IconPlus size={12} />}
                  onClick={() => router.push("/evaluators/new")}
                >
                  New Evaluator
                </Button>
              </Group>
            </Group>

            <Text size="lg" mb="md">
              Gain insight from your production data in real time or batch, by
              evaluating with different types.
            </Text>
          </Stack>
        </Container>
      </Paywall>
    );
  }

  return (
    <Empty
      enable={!evaluators.length}
      Icon={IconActivityHeartbeat}
      title="Evaluators"
      buttonLabel="Create First Evaluator"
      onClick={() => router.push("/evaluators/new")}
      description="Evaluate your production data with custom logic."
    >
      <Container>
        <Stack>
          <Group align="center" justify="space-between">
            <Group align="center">
              <Title>Evaluators</Title>
            </Group>

            <Button
              leftSection={<IconPlus size="12" />}
              variant="default"
              onClick={() => router.push("/evaluators/new")}
            >
              Add Evaluator
            </Button>
          </Group>

          <Text size="xl" mb="md">
            Evaluate your production data with various evaluators.
          </Text>

          <Stack gap="xl">
            {evaluators?.map((ev) => (
              <EvaluatorCard key={ev.id} id={ev.id} initialData={ev} />
            ))}
          </Stack>
        </Stack>
      </Container>
    </Empty>
  );
}
