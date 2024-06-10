import LineChart from "@/components/analytics/LineChart"
import CheckPicker from "@/components/checks/Picker"
import Empty from "@/components/layout/Empty"
import { AreaChart } from "@mantine/charts"
import { useProject } from "@/utils/dataHooks"
import { useAnalyticsData } from "@/utils/dataHooks/analytics"
import { formatCost } from "@/utils/format"
import {
  Button,
  Container,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Title,
} from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import "@mantine/dates/styles.css"
import { useLocalStorage } from "@mantine/hooks"
import {
  IconCalendar,
  IconChartAreaLine,
  IconFilter,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useEffect, useState } from "react"
import { CheckLogic, serializeLogic } from "shared"
import { endOfToday } from "date-fns"

function getDefaultDateRange() {
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const oneWeekAgoDate = new Date(endOfToday)
  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 7)
  oneWeekAgoDate.setHours(0, 0, 0, 0)
  const defaultRange: [Date, Date] = [oneWeekAgoDate, endOfToday]
  return defaultRange
}

/**
 * This deserialize function handles the old localStorage format and
 * corrupted data (e.g., if the data was manually changed by the user).
 */
export function deserializeDateRange(value: any): [Date, Date] {
  const defaultRange: [Date, Date] = getDefaultDateRange()

  if (!value) {
    return defaultRange
  }
  try {
    const range = JSON.parse(value)

    if (!Array.isArray(range) || range.length !== 2) {
      return defaultRange
    }
    if (isNaN(Date.parse(range[0])) || isNaN(Date.parse(range[1]))) {
      return defaultRange
    }

    const [startDate, endDate] = [new Date(range[0]), new Date(range[1])]

    return [startDate, endDate]
  } catch {
    return defaultRange
  }
}

type PresetDateRange = "Today" | "7 Days" | "30 Days" | "3 Months" | "Custom"
type DateRange = [Date, Date]

// TODO tests
export function getDateRangeFromPreset(preset: PresetDateRange) {
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const startDate = new Date(endOfDay)
  startDate.setHours(0, 0, 0, 0)

  if (preset === "7 Days") {
    startDate.setDate(startDate.getDate() - 7)
  } else if (preset === "30 Days") {
    startDate.setDate(startDate.getDate() - 30)
  } else if (preset === "3 Months") {
    startDate.setMonth(startDate.getMonth() - 3)
  }

  return [startDate, endOfDay]
}

// TODO: unit tests
function getPresetFromDateRange(dateRange: DateRange): PresetDateRange {
  const [startDate, endDate] = [new Date(dateRange[0]), new Date(dateRange[1])]
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(startOfToday)
  endOfToday.setHours(23, 59, 59, 999)
  if (
    startDate.getTime() === startOfToday.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "Today"
  }

  const sevenDaysAgo = new Date(endOfToday)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  if (
    startDate.getTime() === sevenDaysAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "7 Days"
  }

  const thirtyDaysAgo = new Date(endOfToday)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  if (
    startDate.getTime() === thirtyDaysAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "30 Days"
  }

  const threeMonthsAgo = new Date(endOfToday)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  threeMonthsAgo.setHours(0, 0, 0, 0)
  if (
    startDate.getTime() === threeMonthsAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "3 Months"
  }

  return "Custom"
}

function DateRangeSelect({ dateRange, setDateRange }) {
  const selectedOption = getPresetFromDateRange(dateRange)
  const data = ["Today", "7 Days", "30 Days", "3 Months"]
  const displayData = selectedOption === "Custom" ? [...data, "Custom"] : data

  function handleSelectChange(value) {
    const newDateRange = getDateRangeFromPreset(value)
    setDateRange(newDateRange)
  }

  return (
    <Select
      placeholder="Select date range"
      w="100"
      size="xs"
      allowDeselect={false}
      styles={{
        input: {
          height: 32,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderRight: 0,
        },
      }}
      data={displayData}
      value={selectedOption}
      onChange={handleSelectChange}
    />
  )
}

interface DateRangePickerProps {
  dateRange: [Date, Date]
  setDateRange: (dates: [Date, Date]) => void
}

function DateRangePicker({ dateRange, setDateRange }: DateRangePickerProps) {
  const [localDateRange, setLocalDateRange] = useState<
    [Date | null, Date | null]
  >([dateRange[0], dateRange[1]])

  useEffect(() => {
    setLocalDateRange([dateRange[0], dateRange[1]])
  }, [dateRange])

  function handleDateChange(dates: [Date | null, Date | null]) {
    setLocalDateRange(dates)
    if (dates[0] && dates[1]) {
      const [startDate, endDate] = dates
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 99)

      setDateRange([dates[0], dates[1]])
    }
  }
  return (
    <DatePickerInput
      type="range"
      placeholder="Pick date range"
      leftSection={<IconCalendar size={18} stroke={1.5} />}
      size="xs"
      w="fit-content"
      styles={{
        input: {
          borderTopLeftRadius: 0,
          height: 32,
          borderBottomLeftRadius: 0,
        },
      }}
      value={localDateRange}
      onChange={handleDateChange}
      maxDate={new Date()}
    />
  )
}

type Granularity = "hourly" | "daily" | "weekly"

interface GranularitySelectProps {
  dateRange: [Date, Date]
  granularity: Granularity
  setGranularity: (granularity: Granularity) => void
}

const determineGranularity = (
  dateRange: [Date, Date],
): "hourly" | "daily" | "weekly" => {
  const [startDate, endDate] = dateRange
  const diffDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)

  if (diffDays <= 1) return "hourly"
  if (diffDays <= 60) return "daily"
  return "weekly"
}

function GranularitySelect({
  dateRange,
  granularity,
  setGranularity,
}: GranularitySelectProps) {
  const [options, setOptions] = useState<
    { value: Granularity; label: string }[]
  >([
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
  ])

  useEffect(() => {
    const newGranularity = determineGranularity(dateRange)
    setGranularity(newGranularity)

    if (newGranularity === "hourly") {
      setOptions([{ value: "hourly", label: "Hourly" }])
    } else if (newGranularity === "daily") {
      setOptions([{ value: "daily", label: "Daily" }])
    } else {
      setOptions([
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
      ])
    }
  }, [dateRange, setGranularity])

  return (
    <Select
      placeholder="Granularity"
      w="100"
      size="xs"
      allowDeselect={false}
      ml="md"
      styles={{
        input: {
          height: 32,
        },
      }}
      data={options}
      value={granularity}
      onChange={(value) => setGranularity(value as Granularity)}
    />
  )
}

// TODO: refactor (put utils functions and components in other file)
// TODO: typescript everywhere
// TODO: checks in url
export default function Analytics() {
  const [dateRange, setDateRange] = useLocalStorage({
    key: "dateRange-analytics",
    getInitialValueInEffect: false,
    deserialize: deserializeDateRange,
    defaultValue: getDefaultDateRange(),
  })
  const [startDate, endDate] = dateRange

  const [granularity, setGranularity] = useLocalStorage<Granularity>({
    key: "granularity-analytics",
    getInitialValueInEffect: false,
    defaultValue: determineGranularity(dateRange),
  })

  // TODO: put checks in their own component
  const [checks, setChecks] = useState<CheckLogic>(["AND"])
  const [showCheckBar, setShowCheckBar] = useState(false)
  const serializedChecks = serializeLogic(checks)

  const { project } = useProject()

  // TODO: refactor this

  const { data: tokensData, isLoading: tokensDataLoading } = useAnalyticsData(
    "tokens",
    startDate,
    endDate,
    granularity,
    serializedChecks,
  )

  const { data: costData, isLoading: costDataLoading } = useAnalyticsData(
    "costs",
    startDate,
    endDate,
    granularity,
    serializedChecks,
  )

  const { data: errorsData, isLoading: errorsDataLoading } = useAnalyticsData(
    "errors",
    startDate,
    endDate,
    granularity,
    serializedChecks,
  )

  const { data: newUsersData, isLoading: newUsersDataLoading } =
    useAnalyticsData("users/new", startDate, endDate, granularity)

  const { data: activeUsersData, isLoading: activeUsersDataLoading } =
    useAnalyticsData("users/active", startDate, endDate, granularity)

  const { data: avgUserCostData, isLoading: avgUserCostDataLoading } =
    useAnalyticsData("users/average-cost", startDate, endDate, granularity)

  const { data: runCountData, isLoading: runCountLoading } = useAnalyticsData(
    "run-types",
    startDate,
    endDate,
    granularity,
    serializedChecks,
  )

  const { data: averageLatencyData, isLoading: averageLatencyDataLoading } =
    useAnalyticsData(
      "latency",
      startDate,
      endDate,
      granularity,
      serializedChecks,
    )

  const { data: feedbackRatioData, isLoading: feedbackRatioLoading } =
    useAnalyticsData(
      "feedback-ratio",
      startDate,
      endDate,
      granularity,
      serializedChecks,
    )

  const showBar =
    showCheckBar ||
    checks.filter((f) => f !== "AND" && !["search", "type"].includes(f.id))
      .length > 0

  const commonChartData = {
    startDate: startDate,
    endDate: endDate,
    granularity: granularity,
  }

  return (
    <Empty
      Icon={IconChartAreaLine}
      title="Waiting for data..."
      description="Analytics will appear here once you have some data."
      showProjectId
      enable={!project?.activated}
    >
      <Container size="xl" my="lg">
        <NextSeo title="Analytics" />
        <Stack gap="lg">
          <Title order={2}>Overview</Title>

          <Group gap="xs">
            <Group gap={0}>
              <DateRangeSelect
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
              <DateRangePicker
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
              <GranularitySelect
                dateRange={dateRange}
                granularity={granularity}
                setGranularity={setGranularity}
              />
            </Group>

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
                ["tags", "model", "users", "metadata"].includes(filter.id)
              }
            />
          )}

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <LineChart
              data={tokensData}
              loading={tokensDataLoading}
              splitBy="name"
              props={["tokens"]}
              agg="sum"
              title="Tokens"
              {...commonChartData}
            />

            <LineChart
              data={costData}
              loading={costDataLoading}
              formatter={formatCost}
              splitBy="name"
              props={["costs"]}
              agg="sum"
              title="Costs"
              {...commonChartData}
            />

            <LineChart
              data={errorsData}
              title="Errors Volume"
              loading={errorsDataLoading}
              description="How many errors were captured in your app"
              agg="sum"
              props={["errors"]}
              {...commonChartData}
            />

            {checks.length < 2 && (
              // Only show new users if no filters are applied, as it's not a metric that can be filtered
              <>
                <LineChart
                  data={newUsersData}
                  loading={newUsersDataLoading}
                  props={["users"]}
                  agg="sum"
                  title="New Users"
                  {...commonChartData}
                />

                <LineChart
                  data={activeUsersData}
                  loading={activeUsersDataLoading}
                  props={["users"]}
                  agg="max"
                  title="Active Users"
                  {...commonChartData}
                />
              </>
            )}

            <LineChart
              data={avgUserCostData}
              loading={avgUserCostDataLoading}
              props={["cost"]}
              formatter={formatCost}
              agg="avg"
              title="Avg. User Cost"
              {...commonChartData}
            />

            <LineChart
              data={runCountData}
              loading={runCountLoading}
              props={["runs"]}
              splitBy="type"
              agg="sum"
              title="Runs Volume"
              {...commonChartData}
            />

            <LineChart
              data={averageLatencyData}
              loading={averageLatencyDataLoading}
              props={["avgDuration"]}
              agg="avg"
              formatter={(value) => `${value.toFixed(2)}s`}
              title="Avg. LLM Latency"
              {...commonChartData}
            />

            <LineChart
              data={feedbackRatioData}
              loading={feedbackRatioLoading}
              props={["ratio"]}
              agg="avg"
              title="Thumbs Up/Down Ratio"
              description="The ratio of thumbs up to thumbs down feedback"
              {...commonChartData}
            />
          </SimpleGrid>
        </Stack>
      </Container>
    </Empty>
  )
}
