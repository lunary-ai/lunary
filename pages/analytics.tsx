import BarList from "@/components/BarList"
import { useCurrentApp, useGroupedRunsWithUsage } from "@/utils/supabaseHooks"
import {
  Card,
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { useQuery } from "@supabase-cache-helpers/postgrest-swr"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useState } from "react"

const AnalyticsCard = ({ title, children }) => (
  <Card withBorder>
    <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
      {title}
    </Text>
    {children}
  </Card>
)

export default function Analytics() {
  const [range, setRange] = useState(7)

  const { usage } = useGroupedRunsWithUsage(range)

  return (
    <Container size="lg">
      <Stack>
        <Group position="apart">
          <Title>Analytics</Title>
          <SegmentedControl
            w={300}
            value={range.toString()}
            onChange={(val) => setRange(parseInt(val))}
            data={[
              { label: "24H", value: "1" },
              { label: "7D", value: "7" },
              { label: "30D", value: "30" },
              { label: "90D", value: "90" },
            ]}
          />
        </Group>
        {usage && (
          <SimpleGrid cols={3} spacing="md">
            <AnalyticsCard title="Tokens">
              <BarList
                data={usage
                  .filter((u) => u.type === "llm")
                  .map((model) => ({
                    value: model.name,
                    count: model.completion_tokens + model.prompt_tokens,
                    composedBy: [
                      {
                        value: "Completion",
                        count: model.completion_tokens,
                        color: "purple",
                      },
                      {
                        value: "Prompt",
                        count: model.prompt_tokens,
                        color: "cyan",
                      },
                    ],
                  }))}
                headers={["Model", "Tokens"]}
              />
            </AnalyticsCard>

            <AnalyticsCard title="Requests">
              <BarList
                data={usage
                  .filter((u) => u.type === "llm")
                  .map((model) => ({
                    value: model.name,
                    count: model.success + model.errors,
                    composedBy: [
                      {
                        value: "Success",
                        count: model.success,
                        color: "green",
                      },
                      {
                        value: "Errors",
                        count: model.errors,
                        color: "red",
                      },
                    ],
                  }))}
                headers={["Model", "Total"]}
              />
            </AnalyticsCard>
            <AnalyticsCard title="Agents">
              <BarList
                data={usage
                  .filter((u) => u.type === "agent")
                  .map((model) => ({
                    value: model.name,
                    count: model.success + model.errors,
                    composedBy: [
                      {
                        value: "Success",
                        count: model.success,
                        color: "green",
                      },
                      {
                        value: "Errors",
                        count: model.errors,
                        color: "red",
                      },
                    ],
                  }))}
                headers={["Model", "Total"]}
              />
            </AnalyticsCard>
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  )
}
