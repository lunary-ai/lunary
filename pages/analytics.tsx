import { useState } from "react"
import AgentSummary from "@/components/Blocks/Analytics/AgentSummary"
import AnalyticsCard from "@/components/Blocks/Analytics/AnalyticsCard"
import BarList from "@/components/Blocks/Analytics/BarList"
import LineChart from "@/components/Blocks/Analytics/LineChart"
import UsageSummary from "@/components/Blocks/Analytics/UsageSummary"
import { formatCost } from "@/utils/format"
import {
  useRunsUsageByDay,
  useRunsUsage,
  useAppUsers,
} from "@/utils/supabaseHooks"
import {
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Title,
} from "@mantine/core"

const calculateDailyCost = (usage) => {
  // calculate using calcRunCost, reduce by model, and filter by type llm
  // reduce by day

  const cost = usage.reduce((acc, curr) => {
    const { date, cost } = curr

    if (!acc[date]) acc[date] = 0
    acc[date] += cost

    return acc
  }, {})

  const final = Object.keys(cost).map((date) => ({
    date,
    cost: cost[date],
  }))

  return final
}

export default function Analytics() {
  const [range, setRange] = useState(7)

  const { usage } = useRunsUsage(range)
  const { dailyUsage } = useRunsUsageByDay(range)
  const { usersWithUsage } = useAppUsers(range)

  return (
    <Container size="lg" my="lg">
      <Stack spacing={40}>
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

        <SimpleGrid
          cols={3}
          breakpoints={[{ maxWidth: "md", cols: 1, spacing: "sm" }]}
          spacing="md"
        >
          {usage && (
            <>
              <UsageSummary usage={usage} />
              <AgentSummary usage={usage} />
            </>
          )}

          {usersWithUsage && (
            <AnalyticsCard title="Users">
              <BarList
                customMetric={{
                  label: "users",
                  value: usersWithUsage.length,
                }}
                data={usersWithUsage
                  .sort((a, b) => a.cost - b.cost)
                  .map((u) => ({
                    value: u.props?.email ?? u.external_id,
                    agentRuns: u.agentRuns,
                    cost: u.cost,
                    barSections: [
                      {
                        value: "cost",
                        tooltip: "Cost",
                        count: u.cost,
                        color: "teal.2",
                      },
                    ],
                  }))}
                columns={[
                  {
                    name: "User",
                    bar: true,
                  },
                  {
                    name: "Cost",
                    key: "cost",
                    render: formatCost,
                    main: true,
                  },
                ]}
              />
            </AnalyticsCard>
          )}
        </SimpleGrid>

        {dailyUsage && (
          <>
            <LineChart
              range={range}
              title="Tokens"
              height={230}
              splitBy="name"
              data={dailyUsage
                .filter((u) => u.type === "llm")
                .map((p) => ({
                  ...p,
                  tokens: p.completion_tokens + p.prompt_tokens,
                }))}
              props={["tokens"]}
            />

            <LineChart
              title="Cost Usage"
              range={range}
              height={230}
              formatter={formatCost}
              data={calculateDailyCost(dailyUsage)}
              props={["cost"]}
            />

            <LineChart
              range={range}
              title="Agents"
              height={230}
              splitBy="name"
              data={dailyUsage
                .filter((u) => u.type === "agent")
                .map((p) => ({
                  ...p,
                  runs: p.success + p.errors,
                }))}
              props={["runs"]}
            />
          </>
        )}
      </Stack>
    </Container>
  )
}
