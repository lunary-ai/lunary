import OrgUserBadge from "@/components/Blocks/OrgUserBadge"
import Paywall from "@/components/Layout/Paywall"
import { useEvaluations } from "@/utils/dataHooks"
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
} from "@mantine/core"
import {
  IconCopy,
  IconDatabase,
  IconDotsVertical,
  IconFlask2Filled,
  IconPlus,
} from "@tabler/icons-react"
import Link from "next/link"
import { useRouter } from "next/router"

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
]

export default function Evaluations() {
  const router = useRouter()
  const { evaluations, isLoading } = useEvaluations()

  if (!isLoading && evaluations.length === 0) {
    router.push("/evaluations/new")
  }

  if (isLoading) {
    return <Loader />
  }

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
              <Button
                leftSection={<IconDatabase size={12} />}
                variant="light"
                component={Link}
                href="/datasets"
              >
                Datasets
              </Button>
              <Button
                leftSection={<IconPlus size={12} />}
                color="blue"
                component={Link}
                href="/evaluations/new"
              >
                New evaluation
              </Button>
            </Group>
          </Group>

          <Text size="lg" mb="md">
            Compare prompts with different models to craft the perfect prompt.
          </Text>

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
                      <Badge variant="light" radius="sm" color="teal" size="sm">
                        Complete
                      </Badge>
                    </Group>
                    <OrgUserBadge userId={evaluation.ownerId} />
                  </Stack>

                  <Group>
                    <Button
                      onClick={() =>
                        router.push(`/evaluations/${evaluation.id}`)
                      }
                      variant="light"
                    >
                      Results
                    </Button>
                    <Menu withArrow shadow="sm" position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="transparent">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconCopy size={16} />}>
                          Edit & Re-Run
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Paywall>
  )
}
