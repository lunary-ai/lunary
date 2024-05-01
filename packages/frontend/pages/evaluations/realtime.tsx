import Paywall from "@/components/layout/Paywall"
import { useOrg } from "@/utils/dataHooks"

import {
  Badge,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconActivityHeartbeat, IconPlus } from "@tabler/icons-react"

const FEATURE_LIST = [
  "Real-time LLM-based evaluations on production data",
  "Enrich logs, with sentiment analysis, topic recognition, PII detection, and more",
  "Use local models like Llama 3 or connect to external APIs",
]

export default function Checklists() {
  const { org } = useOrg()

  return (
    <Paywall
      plan="enterprise"
      feature="Realtime Evaluations"
      Icon={IconActivityHeartbeat}
      p="xl"
      enabled={!org.license.realtimeEvalsEnabled}
      description="Run evaluations on your production data in real-time."
      list={FEATURE_LIST}
    >
      <Container>
        <Stack>
          <Group align="center" justify="space-between">
            <Group align="center">
              <Title>Realtime Evaluations</Title>
              <Badge variant="teal" color="violet">
                Enteprise
              </Badge>
            </Group>

            <Group>
              <Button variant="default" leftSection={<IconPlus size={12} />}>
                New
              </Button>
            </Group>
          </Group>

          <Text size="lg" mb="md">
            Run evaluations on your production data in real-time. They can be
            used to enrich your data with additional information, such as
            sentiment analysis, topic recognition, and more.
          </Text>
        </Stack>
      </Container>
    </Paywall>
  )
}
