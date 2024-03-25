import OrgUserBadge from "@/components/blocks/OrgUserBadge"
import Paywall from "@/components/layout/Paywall"
import { useEvaluations, useUser } from "@/utils/dataHooks"
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core"
import {
  IconChecklist,
  IconDatabase,
  IconFlask2Filled,
  IconInfoCircle,
  IconRefresh,
  IconTable,
} from "@tabler/icons-react"
import Link from "next/link"
import { useRouter } from "next/router"
import { hasAccess } from "shared"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

export default function Evaluations() {
  const router = useRouter()
  const { evaluations, isLoading } = useEvaluations()
  const { user } = useUser()

  return (
    <Paywall
      plan="unlimited"
      feature="Evaluations"
      Icon={IconFlask2Filled}
      description="Evaluate and compare LLM outputs from various models and prompt variations."
      list={FEATURE_LIST}
    >
      <Container>
        <Stack>
          <Group align="center" justify="space-between">
            <Group align="center">
              <Title>Evaluations</Title>
              <Badge variant="light" color="violet">
                Alpha
              </Badge>
            </Group>

            <Group>
              {hasAccess(user.role, "evaluations", "create") && (
                <Button
                  leftSection={<IconFlask2Filled size={12} />}
                  color="blue"
                  variant="gradient"
                  gradient={{ from: "violet", to: "cyan" }}
                  component={Link}
                  href="/evaluations/new"
                >
                  Playground
                </Button>
              )}
            </Group>
          </Group>

          <Text size="lg" mb="md">
            Compare prompts with different models to craft the perfect prompt.
          </Text>

          <Title order={3}>Manage</Title>

          <Alert icon={<IconInfoCircle />}>
            Datasets and checklists are the building blocks of evaluations.
            <br />
            Combine them in the dashboard{" "}
            <Anchor size="sm" href="https://lunary.ai/docs/features/evals/sdk">
              or the SDK
            </Anchor>
            .
          </Alert>

          <Group>
            <Tooltip label="Datasets are collections of prompts that you can use as test-cases">
              <Button
                leftSection={<IconDatabase size={12} />}
                component={Link}
                variant="default"
                href="/datasets"
              >
                Datasets
              </Button>
            </Tooltip>
            <Tooltip label="Checklists are collections of assertions that you can use to define what a success is.">
              <Button
                leftSection={<IconChecklist size={14} />}
                variant="default"
                component={Link}
                href="/evaluations/checklists"
              >
                Checklists
              </Button>
            </Tooltip>
          </Group>

          <Title order={3} mt="lg">
            History
          </Title>

          {isLoading ? (
            <Loader />
          ) : (
            <>
              {!evaluations?.length ? (
                <Alert color="gray" title="No evaluations yet" />
              ) : (
                <Stack gap="xl">
                  {evaluations.map((evaluation) => (
                    <Card key={evaluation.id} p="lg" withBorder>
                      <Group justify="space-between">
                        <Stack>
                          <Group>
                            <Title
                              order={3}
                              size={16}
                              onClick={() =>
                                router.push(`/evaluations/${evaluation.id}`)
                              }
                              style={{ cursor: "pointer" }}
                            >
                              {evaluation.name}
                            </Title>
                            <Badge
                              variant="light"
                              radius="sm"
                              color="teal"
                              size="sm"
                            >
                              Complete
                            </Badge>
                          </Group>

                          <Group>
                            {evaluation.models?.map((model, index) => (
                              <Badge key={index} variant="light" color="blue">
                                {model}
                              </Badge>
                            ))}
                          </Group>
                          <Group>
                            {evaluation.providers?.map((provider, index) => (
                              <Badge key={index} variant="light" color="blue">
                                {provider.model}
                              </Badge>
                            ))}
                          </Group>
                          <OrgUserBadge userId={evaluation.ownerId} />
                        </Stack>

                        <Group>
                          <Button
                            component={Link}
                            size="xs"
                            href={`/evaluations/${evaluation.id}`}
                            leftSection={<IconTable size={12} />}
                            variant="light"
                          >
                            Results
                          </Button>
                          <Button
                            variant="light"
                            color="teal"
                            size="xs"
                            leftSection={<IconRefresh size={12} />}
                            component={Link}
                            href={`/evaluations/new?clone=${evaluation.id}`}
                          >
                            Again
                          </Button>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Container>
    </Paywall>
  )
}
