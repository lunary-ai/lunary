import AnalyticsCard from "@/components/analytics/AnalyticsCard"
import BarList from "@/components/analytics/BarList"
import LineChart from "@/components/analytics/LineChart"
import UsageSummary from "@/components/analytics/UsageSummary"
import { formatAppUser, formatCost } from "@/utils/format"
import { DatePickerInput } from "@mantine/dates"
import CheckPicker from "@/components/checks/Picker"
import "@mantine/dates/styles.css"

import AppUserAvatar from "@/components/blocks/AppUserAvatar"
import Empty from "@/components/layout/Empty"
import {
  useAppUsers,
  useOrg,
  useProject,
  useRunsUsage,
  useRunsUsageByDay,
} from "@/utils/dataHooks"
import {
  Anchor,
  Center,
  Container,
  Group,
  Input,
  InputWrapper,
  Loader,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"
import { IconCalendar, IconChartAreaLine } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useEffect, useState } from "react"
import { CheckLogic } from "shared"

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
  const [range, setRange] = useLocalStorage({
    key: "dateRange-analytics",
    defaultValue: 7,
  })

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ])
  const [filters, setFilters] = useState<CheckLogic>(["AND"])
  const [granularity, setGranularity] = useState<"hour" | "day" | "week">("day")
  const [predefinedRange, setPredefinedRange] = useState("7d")

  const { project } = useProject()

  const { usage, loading: usageLoading } = useRunsUsage(range)

  const { dailyUsage, loading: dailyUsageLoading } = useRunsUsageByDay(range)
  const { users, loading: usersLoading } = useAppUsers(range)

  const loading = usageLoading || dailyUsageLoading || usersLoading

  function editRange(newRange: string) {
    const today = new Date()
    switch (newRange) {
      case "1d":
        setDateRange([today, today])
        setGranularity("hour")
        break
      case "7d":
        setDateRange([
          new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
          today,
        ])
        setGranularity("day")
        break
      case "30d":
        setDateRange([
          new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
          today,
        ])
        setGranularity("day")
        break
      case "3m":
        setDateRange([
          new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000),
          today,
        ])
        setGranularity("week")
        break
      default:
        break
    }
  }

  useEffect(() => {
    editRange("7d")
  }, [])

  if (loading)
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    )

  return (
    <Empty
      Icon={IconChartAreaLine}
      title="Waiting for data..."
      description="Analytics will appear here once you have some data."
      showProjectId
      enable={!loading && !project?.activated}
    >
      <Container size="lg" my="lg">
        <NextSeo title="Analytics" />
        <Stack gap="lg">
          <Title order={2}>Overview</Title>
          <Group>
            <Group gap={0}>
              <Select
                w={100}
                size="xs"
                allowDeselect={false}
                value={predefinedRange}
                onChange={(val) => {
                  setPredefinedRange(val)
                  editRange(val)
                }}
                styles={{
                  input: {
                    height: 32,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    borderRight: 0,
                  },
                }}
                data={[
                  {
                    value: "1d",
                    label: "Today",
                  },
                  {
                    value: "7d",
                    label: "7 Days",
                  },
                  {
                    value: "30d",
                    label: "30 Days",
                  },
                  {
                    value: "3m",
                    label: "3 Months",
                  },
                  {
                    value: "custom",
                    label: "Custom",
                    disabled: true,
                  },
                ]}
              />
              <DatePickerInput
                leftSection={<IconCalendar size={18} stroke={1.5} />}
                leftSectionPointerEvents="none"
                type="range"
                styles={{
                  input: {
                    borderTopLeftRadius: 0,
                    height: 32,
                    borderBottomLeftRadius: 0,
                  },
                }}
                w={"fit-content"}
                maxDate={new Date()}
                size="xs"
                placeholder="Pick dates range"
                value={dateRange}
                onChange={(val) => {
                  setDateRange(val as [Date, Date])
                  setPredefinedRange("custom")
                }}
              />
            </Group>

            <Text size="xs" c="dimmed">
              by
            </Text>

            <Select
              w={80}
              placeholder="Granularity"
              value={granularity}
              onChange={setGranularity}
              allowDeselect={false}
              size="xs"
              data={[
                {
                  value: "hour",
                  label: "Hour",
                },
                {
                  value: "day",
                  label: "Day",
                },
                {
                  value: "week",
                  label: "Week",
                },
              ]}
            />

            <CheckPicker
              minimal
              onChange={setFilters}
              value={filters}
              restrictTo={(filter) =>
                // Only show these for now to not confuse the user with too many options
                ["type", "tags", "model", "users", "metadata"].includes(
                  filter.id,
                )
              }
            />

            {/* <SegmentedControl
              w={300}
              value={range.toString()}
              onChange={(val) => setRange(parseInt(val))}
              data={[
                { label: "24H", value: "1" },
                { label: "7D", value: "7" },
                { label: "30D", value: "30" },
                { label: "90D", value: "90" },
              ]}
            /> */}
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {usage && (
              <>
                <UsageSummary usage={usage} />
                {/* <AgentSummary usage={usage} /> */}
              </>
            )}

            {users && (
              <AnalyticsCard title="Users">
                <BarList
                  customMetric={{
                    label: "users",
                    value: users.length,
                  }}
                  filterZero={false}
                  data={users
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
                      render: (_, user) => (
                        <Group
                          my={-4}
                          gap="sm"
                          wrap="nowrap"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <AppUserAvatar size={30} user={user} />
                          <Text
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            size="sm"
                            px="md"
                          >
                            <Anchor
                              c="inherit"
                              underline="never"
                              href={`/users/${user.id}`}
                            >
                              {formatAppUser(user)}
                            </Anchor>
                          </Text>
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
                    tokens: p.completionTokens + p.promptTokens,
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

              {/* <LineChart
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
              /> */}

              <LineChart
                blocked={true}
                props={["users"]}
                range={range}
                title="Avg User Cost"
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
        </Stack>
      </Container>
    </Empty>
  )
}
