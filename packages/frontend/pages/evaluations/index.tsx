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
  IconDotsVertical,
  IconFlask2Filled,
  IconPlus,
} from "@tabler/icons-react"
import { useRouter } from "next/router"
import { useEffect } from "react"

export default function Evaluations() {
  const router = useRouter()
  const { evaluations, isLoading } = useEvaluations()

  if (isLoading) {
    return <Loader />
  }

  if (!isLoading && evaluations.length === 0) {
    return router.push("/evaluations/new")
  }

  const FEATURE_LIST = []

  return 1

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

            <Button
              leftSection={<IconPlus size={12} />}
              variant="light"
              color="blue"
              onClick={() => {
                router.push("/evaluations/new")
              }}
            >
              New Evaluation
            </Button>
          </Group>

          <Text size="lg" mb="md">
            Evaluate and compare LLM outputs from various models and prompt
            variations.
          </Text>

          <Stack gap="xl">
            {evaluations.map((evaluation, i) => (
              <Card p="lg" withBorder>
                <Group justify="space-between">
                  <Stack gap="0">
                    <Group>
                      <Title order={3} size="16px">
                        {evaluation.name}
                      </Title>
                      <Badge
                        variant="light"
                        radius="sm"
                        color="green"
                        size="xs"
                      >
                        Complete
                      </Badge>
                    </Group>
                    <Text size="14px" mt="6" c="dimmed">
                      Created by {evaluation.ownerName}
                    </Text>
                  </Stack>

                  <Group>
                    <Button
                      onClick={() =>
                        router.push(`/evaluations/${evaluation.id}`)
                      }
                      variant="light"
                    >
                      View results
                    </Button>
                    <Menu withArrow shadow="sm" position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="transparent">
                          <IconDotsVertical size={24} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconCopy size={16} />}>
                          Duplicate
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
