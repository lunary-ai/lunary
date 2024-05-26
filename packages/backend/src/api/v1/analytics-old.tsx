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
  useProject,
  useRunsUsage,
  useRunsUsageByDay,
} from "@/utils/dataHooks"
import {
  Anchor,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { useDidUpdate, useLocalStorage } from "@mantine/hooks"
import {
  IconCalendar,
  IconChartAreaLine,
  IconFilter,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useEffect, useState } from "react"
import { CheckLogic, deserializeLogic, serializeLogic } from "shared"
import { useRouter } from "next/router"

function calculateDailyCost(usage) {
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
  const router = useRouter()

  const [range, setRange] = useLocalStorage({
    key: "dateRange-analytics",
    defaultValue: 7,
  })

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ])

  const [checks, setChecks] = useState<CheckLogic>(["AND"])
  const [serializedChecks, setSerializedChecks] = useState<string>("")
  const [granularity, setGranularity] = useState<"hour" | "day" | "week">("day")
  const [predefinedRange, setPredefinedRange] = useState("7d")
  const [showCheckBar, setShowCheckBar] = useState(false)
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

  useDidUpdate(() => {
    let serialized = serializeLogic(checks)

    if (typeof serialized === "string") {
      setSerializedChecks(serialized)
      router.replace(`/analytics?${serialized}`)
    }
  }, [checks])

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)

      const paramString = urlParams.toString()
      if (paramString) {
        const filtersData = deserializeLogic(paramString)
        if (filtersData) {
          setChecks(filtersData)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const showBar =
    showCheckBar ||
    checks.filter((f) => f !== "AND" && !["search", "type"].includes(f.id))
      .length > 0

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
      <Container size="xl" my="lg">
        <NextSeo title="Analytics" />
        <Stack gap="lg">
          <Title order={2}>Overview</Title>

          <Group gap="xs">
            <Group gap={0}>
              <Select
                w={100}
                size="xs"
                allowDeselect={false}
                value={predefinedRange}
                onChange={(val: string) => {
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
              onChange={(val: string) =>
                setGranularity(val as "hour" | "day" | "week")
              }
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

            {!showBar && (
              <Button
                variant="subtle"
                onClick={() => setShowCheckBar(true)}
                leftSection={<IconFilter size={12} />}
                size="xs"
              >
                Add filters
              </Button>
            )}
          </Group>

          {showBar && (
            <CheckPicker
              minimal
              onChange={setChecks}
              defaultOpened={showCheckBar}
              value={checks}
              restrictTo={(filter) =>
                // Only show these for now to not confuse the user with too many options
                ["type", "tags", "model", "users", "metadata"].includes(
                  filter.id,
                )
              }
            />
          )}

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {usage && <UsageSummary usage={usage} />}

            {users && (
              <AnalyticsCard title="Top Users">
                <BarList
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

            {dailyUsage && (
              <>
                <LineChart
                  title="LLM Costs"
                  range={range}
                  height={230}
                  splitBy="name"
                  formatter={formatCost}
                  data={calculateDailyCost(dailyUsage)}
                  agg="sum"
                  props={["cost"]}
                />

                {checks.length < 2 && (
                  // Only show new users if no filters are applied, as it's not a metric that can be filtered
                  <LineChart
                    blocked={true}
                    range={range}
                    props={["users"]}
                    agg="sum"
                    title="New Users"
                    height={230}
                  />
                )}

                <LineChart
                  blocked={true}
                  range={range}
                  props={["users"]}
                  agg="sum"
                  title="Runs Volume"
                  height={230}
                />

                <LineChart
                  range={range}
                  title="Tokens"
                  height={230}
                  splitBy="name" // split by model
                  data={dailyUsage
                    .filter((u) => u.type === "llm")
                    .map((p) => ({
                      ...p,
                      tokens: p.completionTokens + p.promptTokens,
                    }))}
                  agg="sum"
                  props={["tokens"]}
                />

                <LineChart
                  blocked={true}
                  props={["cost"]}
                  range={range}
                  title="Avg. Cost per User"
                  description="Average cost per user from their LLM usage"
                  agg="avg"
                  height={230}
                />

                {/* <LineChart
                  blocked={true}
                  range={range}
                  props={["errors"]}
                  title="Errors Volume"
                  description="How many errors were captured in your app"
                  agg="sum"
                  height={230}
                /> */}
                {/* 
                <LineChart
                  blocked={true}
                  range={range}
                  props={["seconds"]}
                  title="Avg. LLM Latency"
                  description="Average time it takes to generate a response for your LLMs"
                  agg="avg"
                  height={230}
                /> */}

                <LineChart
                  blocked={true}
                  range={range}
                  props={["users"]}
                  title="Thumbs up/down ratio"
                  description="Visualize the thumbs up/down ratio for your data"
                  agg="avg"
                  height={230}
                />

                <LineChart
                  blocked={true}
                  range={range}
                  props={["messages"]}
                  description="How many messages were sent per threads or conversation (need chat-tracking to be enabled)"
                  title="Avg. Messages per Conversation"
                  agg="avg"
                  height={230}
                />

                <LineChart
                  blocked={true}
                  range={range}
                  props={["template"]}
                  description="How many times prompt templates were used for LLM calls"
                  title="Prompt Templates Usage"
                  agg="sum"
                  height={230}
                />
              </>
            )}
          </SimpleGrid>
        </Stack>
      </Container>
    </Empty>
  )
}
