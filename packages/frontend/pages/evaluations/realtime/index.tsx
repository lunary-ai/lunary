import Paywall from "@/components/layout/Paywall"
import { useOrg } from "@/utils/dataHooks"
import { useEvaluator, useEvaluators } from "@/utils/dataHooks/evaluators"
import { slugify } from "@/utils/format"
import EVALUATOR_TYPES from "@/utils/evaluators"

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
  IconActivity,
  IconActivityHeartbeat,
  IconDotsVertical,
  IconEdit,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useRouter } from "next/router"
import Empty from "@/components/layout/Empty"

const FEATURE_LIST = [
  "Real-time LLM-based evaluations on production data",
  "Enrich logs, with sentiment analysis, topic recognition, PII detection, and more",
  "Use local models like Llama 3 or connect to external APIs",
]

export default function RealtimeEvaluators() {
  const { org } = useOrg()
  const router = useRouter()
  const { evaluators, isLoading } = useEvaluators()

  if (isLoading) {
    return <Loader />
  }

  // return (
  //   <Paywall
  //     plan="enterprise"
  //     feature="Realtime Evaluations"
  //     Icon={IconActivityHeartbeat}
  //     p="xl"
  //     enabled={!org.license.realtimeEvalsEnabled}
  //     description="Run evaluations on your production data in real-time."
  //     list={FEATURE_LIST}
  //   >
  //     <Container>
  //       <Stack>
  //         <Group align="center" justify="space-between">
  //           <Group align="center">
  //             <Title>Realtime Evaluations</Title>
  //             <Badge variant="teal" color="violet">
  //               Enteprise
  //             </Badge>
  //           </Group>

  //           <Group>
  //             <Button variant="default" leftSection={<IconPlus size={12} />}>
  //               New
  //             </Button>
  //           </Group>
  //         </Group>

  //         <Text size="lg" mb="md">
  //           Run evaluations on your production data in real-time. They can be
  //           used to enrich your data with additional information, such as
  //           sentiment analysis, topic recognition, and more.
  //         </Text>
  //       </Stack>
  //     </Container>
  //   </Paywall>
  // )

  return (
    <Empty
      enable={!evaluators.length}
      Icon={IconActivityHeartbeat}
      title="Real-time Evaluations"
      buttonLabel="Create First Evaluator"
      onClick={() => router.push("/evaluations/realtime/new")}
      description="Run evaluations on your production data in real-time with task-optimized models."
    >
      <Container>
        <Stack>
          <Group align="center" justify="space-between">
            <Group align="center">
              <Title>Evaluators</Title>
              <Badge variant="light" color="blue">
                Beta
              </Badge>
            </Group>

            <Button
              leftSection={<IconPlus size={12} />}
              variant="default"
              onClick={() => router.push("/evaluations/realtime/new")}
            >
              New Evaluator
            </Button>
          </Group>

          <Text size="xl" mb="md">
            Run evaluations on your production data in real-time.
          </Text>

          <Stack gap="xl">
            {evaluators?.map((evaluator) => (
              <EvaluationCard
                key={evaluator.id}
                id={evaluator.id}
                initialData={evaluator}
              />
            ))}
          </Stack>
        </Stack>
      </Container>
    </Empty>
  )
}

function EvaluationCard({ id, initialData }) {
  const { evaluator, delete: deleteEvaluator } = useEvaluator(id, initialData)

  const { description, icon: Icon } = EVALUATOR_TYPES[evaluator.type]

  return (
    <Card p="lg" withBorder>
      <Group justify="space-between">
        <Stack>
          <Group>
            <Icon size={24} />
            <Title order={3} size={16}>
              {evaluator.name}
            </Title>
            <Text c="dimmed" fw="semibold" size="sm">
              {description}
            </Text>
          </Group>
          <Group>
            <Text c="dimmed" fw="semibold" size="sm">
              {slugify(evaluator.name)}
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
              leftSection={
                <IconPencil color="blue" width="15px" height="15px" />
              }
              disabled
              onClick={() => {}}
            >
              Update
            </Menu.Item>
            <Menu.Item
              leftSection={<IconTrash color="red" width="15px" height="15px" />}
              onClick={() => deleteEvaluator()}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  )
}
