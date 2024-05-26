import Paywall from "@/components/layout/Paywall"
import { useEvaluators, useOrg } from "@/utils/dataHooks"

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
  IconActivityHeartbeat,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useRouter } from "next/router"

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

  // TODO:
  // if (false) {
  //   return (
  //     <Paywall
  //       plan="enterprise"
  //       feature="Realtime Evaluations"
  //       Icon={IconActivityHeartbeat}
  //       p="xl"
  //       enabled={!org.license.realtimeEvalsEnabled}
  //       description="Run evaluations on your production data in real-time."
  //       list={FEATURE_LIST}
  //     >
  //       <Container>
  //         <Stack>
  //           <Group align="center" justify="space-between">
  //             <Group align="center">
  //               <Title>Realtime Evaluations</Title>
  //               <Badge variant="teal" color="violet">
  //                 Enteprise
  //               </Badge>
  //             </Group>

  //             <Group>
  //               <Button variant="default" leftSection={<IconPlus size={12} />}>
  //                 New
  //               </Button>
  //             </Group>
  //           </Group>

  //           <Text size="lg" mb="md">
  //             Run evaluations on your production data in real-time. They can be
  //             used to enrich your data with additional information, such as
  //             sentiment analysis, topic recognition, and more.
  //           </Text>
  //         </Stack>
  //       </Container>
  //     </Paywall>
  //   )
  // }

  return (
    //TODO: add slug
    <Container>
      <Stack gap="lg">
        <Group align="center" justify="space-between">
          <Group align="center">
            <Title>Real-time Evaluations</Title>
            <Badge variant="light" color="blue">
              Alpha
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

        {evaluators?.map((evaluator) => (
          <Card key={evaluator.id} p="lg" withBorder>
            <Group justify="space-between">
              <Stack gap="0">
                <Title order={3} size={16}>
                  {evaluator.name}
                </Title>
                <Text>{evaluator.description}</Text>
              </Stack>

              <Menu>
                <Menu.Target>
                  <ActionIcon variant="transparent">
                    {/* TODO: use mantine gray*/}
                    <IconDotsVertical color="gray" />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEdit width="15px" height="15px" />}
                  >
                    Edit
                  </Menu.Item>
                  {/* TODO: use mantine red*/}
                  <Menu.Item
                    leftSection={
                      <IconTrash color="red" width="15px" height="15px" />
                    }
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  )
}
