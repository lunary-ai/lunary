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
  SimpleGrid,
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
  const isBuiltin = evaluatorAny?.kind === "builtin";

  return (
    <Card p={16} withBorder>
      <Group justify="space-between">
        <Stack w="100%">
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
                  {!isBuiltin && (
                    <Menu.Item
                      leftSection={
                        <IconTrash color="red" width="15px" height="15px" />
                      }
                      onClick={() => deleteEvaluator()}
                    >
                      Delete
                    </Menu.Item>
                  )}
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
  const builtinEvaluators = evaluatorsList.filter(
    (evaluator) => evaluator?.kind === "builtin",
  );
  const customEvaluators = evaluatorsList.filter(
    (evaluator) => evaluator?.kind !== "builtin",
  );

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
              Create Evaluator
            </Button>
          </Group>

          <Stack gap="xl">
            {builtinEvaluators.length > 0 && (
              <Stack gap="sm">
                <Title order={4}>Built-in Evaluators</Title>
                <SimpleGrid cols={2} spacing={24}>
                  {builtinEvaluators.map((ev) => (
                    <EvaluatorCard key={ev.id} id={ev.id} initialData={ev} />
                  ))}
                </SimpleGrid>
              </Stack>
            )}

            <Stack gap="sm">
              <Title order={4}>Custom Evaluators</Title>
              {customEvaluators.length > 0 ? (
                <SimpleGrid cols={2} spacing={24}>
                  {customEvaluators.map((ev) => (
                    <EvaluatorCard key={ev.id} id={ev.id} initialData={ev} />
                  ))}
                </SimpleGrid>
              ) : (
                <Text c="dimmed" size="sm">
                  No custom evaluators yet. Create one to get started.
                </Text>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Empty>
  );
}
