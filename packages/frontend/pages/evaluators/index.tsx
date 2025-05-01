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
  Box,
  Grid,
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
  const evaluatorAny = evaluator as any;

  const evalMeta = EVALUATOR_TYPES[evaluatorAny?.type];

  if (!evalMeta) return null;

  const { description, icon: Icon } = evalMeta;

  return (
    <Card
      p="lg"
      radius="md"
      shadow="sm"
      withBorder
      style={{ cursor: "pointer" }}
    >
      <Group justify="space-between">
        <Stack>
          <Group justify="space-between">
            <Group>
              <Icon size={24} />
              <Title order={3} size={16}>
                {evaluatorAny?.name}
              </Title>
            </Group>

            <Group>
              {evaluatorAny?.mode === "realtime" && (
                <Badge color="green" variant="light" size="md">
                  Live
                </Badge>
              )}
              <Menu>
                <Menu.Target>
                  <ActionIcon variant="transparent">
                    <IconDotsVertical color="gray" height="18px" />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={
                      <IconTrash color="red" width="15px" height="15px" />
                    }
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
          </Group>
          <Group>
            <Text c="dimmed" fw="semibold" size="sm">
              {description}
            </Text>
          </Group>
        </Stack>
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
  const evaluatorsList = (evaluators as any[]) || [];
  const { org } = useOrg();

  if (isLoading) {
    return <Loader />;
  }

  if (org.plan === "free") {
    return (
      <Paywall
        plan="enterprise"
        feature="Evaluators"
        description="Real-time evaluators are an enterprise feature"
        Icon={IconActivityHeartbeat}
        p={32}
        enabled={!org.license.realtimeEvalsEnabled}
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
      enable={!evaluatorsList.length}
      Icon={IconActivityHeartbeat}
      title="Evaluators"
      buttonLabel="Create First Evaluator"
      onClick={() => router.push("/evaluators/new")}
    >
      <Container py="xl">
        <Box>
          <Group align="center" justify="space-between" mb="lg">
            <Title>Evaluators</Title>
            <Button
              leftSection={<IconPlus size={12} />}
              variant="default"
              onClick={() => router.push("/evaluators/new")}
            >
              Add Evaluator
            </Button>
          </Group>

          <Grid gutter="lg">
            {evaluatorsList.map((ev) => (
              <Grid.Col xs={12} sm={6} key={ev.id}>
                <EvaluatorCard id={ev.id} initialData={ev} />
              </Grid.Col>
            ))}
          </Grid>
        </Box>
      </Container>
    </Empty>
  );
}
