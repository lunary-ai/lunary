import { useState } from "react"
import AgentSummary from "@/components/Blocks/Analytics/AgentSummary"
import AnalyticsCard from "@/components/Blocks/Analytics/AnalyticsCard"
import BarList from "@/components/Blocks/Analytics/BarList"
import LineChart from "@/components/Blocks/Analytics/LineChart"
import UsageSummary from "@/components/Blocks/Analytics/UsageSummary"
import { formatAppUser, formatCost } from "@/utils/format"
import {
  useRunsUsageByDay,
  useRunsUsage,
  useAppUsers,
  useCurrentApp,
  useTeam,
} from "@/utils/supabaseHooks"
import {
  Center,
  Container,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Title,
} from "@mantine/core"
import AppUserAvatar from "@/components/Blocks/AppUserAvatar"
import Empty from "@/components/Layout/Empty"
import { IconChartAreaLine } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import ErrorBoundary from "@/components/Blocks/ErrorBoundary"

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
  const { app } = useCurrentApp()

  const { team } = useTeam()

  const { usage, loading: usageLoading } = useRunsUsage(range)
  const { dailyUsage, loading: dailyUsageLoading } = useRunsUsageByDay(range)
  const { usersWithUsage, loading: usersLoading } = useAppUsers(range)

  const loading = usageLoading || dailyUsageLoading || usersLoading

  if (loading)
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    )

  if (!loading && app && !app.activated) {
    return <Empty Icon={IconChartAreaLine} what="data" />
  }

  return (
    <Container size="lg" my="lg">
      <NextSeo title="Analytics" />
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
                filterZero={false}
                data={usersWithUsage
                  .sort((a, b) => a.cost - b.cost)
                  .map((u) => ({
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
                    ...u,
                  }))}
                columns={[
                  {
                    name: "User",
                    render: (u, row) => (
                      <Group my={-4} spacing="sm">
                        <AppUserAvatar size={30} user={row} />
                        {formatAppUser(row)}
                      </Group>
                    ),
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

            {team?.plan === "free" && (
              <>
                <LineChart
                  blocked={true}
                  props={["users"]}
                  range={range}
                  title="Cost per user"
                  height={230}
                />

                <LineChart
                  blocked={true}
                  range={range}
                  props={["users"]}
                  title="Errors over time"
                  height={230}
                />

                <LineChart
                  blocked={true}
                  range={range}
                  props={["users"]}
                  title="Avg latency"
                  height={230}
                />

                <LineChart
                  blocked={true}
                  range={range}
                  props={["users"]}
                  title="Positive feedback"
                  height={230}
                />
              </>
            )}
          </>
        )}
      </Stack>
    </Container>
  )
}
