import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Tooltip as MantineTooltip,
  Group,
  Overlay,
  Text,
  Title,
  Loader,
} from "@mantine/core"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

import { formatLargeNumber } from "@/utils/format"
import { IconBolt, IconInfoCircle } from "@tabler/icons-react"
import {
  eachDayOfInterval,
  eachHourOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
} from "date-fns"
import { Fragment } from "react"
import ErrorBoundary from "../blocks/ErrorBoundary"
import { openUpgrade } from "../layout/UpgradeModal"
import { theme } from "@/utils/theme"
import { slugify } from "@/utils/format"

function prepareDataForRecharts(
  data: any[],
  splitBy: string | undefined,
  props: string[],
  startDate: Date,
  endDate: Date,
  granularity: "daily" | "hourly" | "weekly",
): any[] {
  const output: any[] = []

  if (!data) data = []

  const uniqueSplitByValues = getUniqueSplitByValues(data, splitBy)
  const interval = getIntervalFunction(granularity)

  interval({ start: startDate, end: endDate }).forEach((date) => {
    const formattedDate = formatDateForGranularity(date, granularity)
    const dayData: { [key: string]: any } = { date: formattedDate }

    props.forEach((prop) => {
      if (splitBy) {
        uniqueSplitByValues.forEach((splitByValue) => {
          dayData[`${splitByValue} ${prop}`] = findDataValue(
            data,
            splitBy,
            splitByValue,
            formattedDate,
            granularity,
            prop,
          )
        })
      } else {
        dayData[prop] = findDataValue(
          data,
          undefined,
          undefined,
          formattedDate,
          granularity,
          prop,
        )
      }
    })

    output.push(dayData)
  })

  return output.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
}

function getUniqueSplitByValues(
  data: any[],
  splitBy: string | undefined,
): string[] {
  return splitBy
    ? Array.from(new Set(data.map((item) => item[splitBy]?.toString())))
    : []
}

function getIntervalFunction(granularity: "daily" | "hourly" | "weekly") {
  return granularity === "daily"
    ? eachDayOfInterval
    : granularity === "hourly"
      ? eachHourOfInterval
      : eachWeekOfInterval
}

function formatDateForGranularity(
  date: Date,
  granularity: "daily" | "hourly" | "weekly",
): string {
  return format(
    date,
    granularity === "daily"
      ? "yyyy-MM-dd"
      : granularity === "hourly"
        ? "yyyy-MM-dd'T'HH"
        : "yyyy-'W'ww",
  )
}

function findDataValue(
  data: any[],
  splitBy: string | undefined,
  splitByValue: string | undefined,
  formattedDate: string,
  granularity: "daily" | "hourly" | "weekly",
  prop: string,
): any {
  return (
    data?.find(
      (item) =>
        (!splitBy || item[splitBy]?.toString() === splitByValue) &&
        format(parseISO(item.date), getDateFormat(granularity)) ===
          formattedDate,
    )?.[prop] || 0
  )
}

function getDateFormat(granularity: "daily" | "hourly" | "weekly"): string {
  return granularity === "daily"
    ? "yyyy-MM-dd"
    : granularity === "hourly"
      ? "yyyy-MM-dd'T'HH"
      : "yyyy-'W'ww"
}

const formatDate = (date, granularity) => {
  if (!date) return
  switch (granularity) {
    case "daily":
      return format(parseISO(date), "MMM d")
    case "hourly":
      return format(parseISO(date), "eee, HH'h'")
    case "weekly":
      return format(parseISO(date), "MMM d")
  }
}
const CustomizedAxisTick = ({ x, y, payload, index, data, granularity }) => {
  // // Hide the first and last tick
  // if (index === 0 || index === data.length - 1) {
  //   return null
  // }

  // offset the first and last tick to make it look better
  const offset = index === 0 ? 42 : index === 1 ? -42 : 0

  return (
    <g transform={`translate(${x + offset},${y})`}>
      <text x={0} y={0} dy={16} textAnchor={"middle"} fill="#666" opacity={0.8}>
        {formatDate(payload.value, granularity)}
      </text>
    </g>
  )
}

type LineChartData = {
  date: string
  [key: string]: any
}[]

type LineChartProps = {
  data: LineChartData
  title: string | JSX.Element
  props: string[]
  blocked?: boolean
  formatter?: (value: number) => string
  height?: number
  loading?: boolean
  splitBy?: string

  description?: string
  startDate: Date
  endDate: Date
  granularity: "daily" | "hourly" | "weekly"
  agg: string
  chartExtra?: JSX.Element
  stat?: number
}

function getFigure(agg: string, data: any[], prop: string) {
  const propKeys = Object.keys(data[0] || {}).filter((key) =>
    key.includes(prop),
  )

  if (agg === "sum") {
    return data.reduce((acc, item) => {
      propKeys.forEach((key) => (acc += item[key] ?? 0))
      return acc
    }, 0)
  } else if (agg === "avg") {
    const filteredData = data.filter((item) => item[prop] !== 0)
    return (
      filteredData.reduce((acc, item) => {
        propKeys.forEach((key) => (acc += item[key] ?? 0))
        return acc
      }, 0) / filteredData.length || 0
    )
  } else if (agg === "max") {
    return data.reduce((acc, item) => {
      propKeys.forEach((key) => (acc = Math.max(acc, item[key] ?? -Infinity)))
      return acc
    }, -Infinity)
  } else if (agg === "min") {
    return data.reduce((acc, item) => {
      propKeys.forEach((key) => (acc = Math.min(acc, item[key] ?? Infinity)))
      return acc
    }, Infinity)
  }
  return 0
}
const LineChartComponent = ({
  data,
  title,
  props,
  blocked = false,
  formatter = formatLargeNumber,
  height = 230,
  description,
  loading = false,
  splitBy = undefined,
  startDate,
  endDate,
  granularity,
  agg,
  chartExtra,
  stat,
}: LineChartProps) => {
  const colors = ["blue", "pink", "indigo", "green", "violet", "yellow"]
  console.log(title, stat)

  const cleanedData = prepareDataForRecharts(
    blocked
      ? ((
          startDate: Date,
          endDate: Date,
          granularity: "daily" | "hourly" | "weekly",
        ): LineChartData => {
          const data: LineChartData = []
          const interval =
            granularity === "daily"
              ? eachDayOfInterval
              : granularity === "hourly"
                ? eachHourOfInterval
                : eachWeekOfInterval
          interval({ start: startDate, end: endDate }).forEach((date) => {
            const users = Math.floor(Math.random() * 6000) + 4000
            data.push({
              date: date.toISOString(),
              users: users,
            })
          })
          return data
        })(startDate, endDate, granularity)
      : data,
    splitBy,
    props,
    startDate,
    endDate,
    granularity,
  )

  const hasData = blocked ? true : cleanedData?.length
  // (splitBy ? Object.keys(cleanedData[0]).length > 1 : data?.length)

  const total =
    stat === undefined || stat === null
      ? getFigure(agg, cleanedData, props[0])
      : stat

  return (
    <Card withBorder p={0} className="lineChart" radius="md">
      <Group gap="xs">
        {typeof title === "string" ? (
          <Text c="dimmed" fw={50} fz="md" m="md" mr={0}>
            {title}
          </Text>
        ) : (
          <Box m="lg" mb="sm">
            {title}
          </Box>
        )}

        {description && (
          <MantineTooltip label={description}>
            <IconInfoCircle size={16} opacity={0.5} />
          </MantineTooltip>
        )}
      </Group>

      {loading && (
        <>
          <Overlay
            h="100%"
            blur={5}
            backgroundOpacity={0.05}
            p="lg"
            zIndex={3}
          />
          <Center
            ta="center"
            style={{
              position: "absolute",
              zIndex: 3,
            }}
            h="100%"
            w="100%"
          >
            <Loader />
          </Center>
        </>
      )}

      {typeof total === "number" && (
        <Text fw={500} fz={24} mt={-12} ml="md">
          {formatter(total)}
        </Text>
      )}

      <Box mt="sm" pos="relative">
        {blocked && (
          <>
            <Overlay
              h="100%"
              blur={15}
              backgroundOpacity={0.1}
              p="lg"
              zIndex={1}
            />
            <Center
              ta="center"
              style={{
                position: "absolute",
                zIndex: 2,
              }}
              h="100%"
              w="100%"
            >
              <Alert
                title="Advanced Analytics"
                bg="var(--mantine-primary-color-light)"
                p="12"
              >
                Upgrade to <b>Team</b> to unlock this chart
                <br />
                <Button
                  mt="md"
                  onClick={() => openUpgrade("analytics")}
                  size="xs"
                  variant="gradient"
                  gradient={{ from: "#0788ff", to: "#9900ff", deg: 30 }}
                  leftSection={<IconBolt size="16" />}
                >
                  Upgrade
                </Button>
              </Alert>
            </Center>
          </>
        )}

        {!hasData && (
          <>
            <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
            <Center
              ta="center"
              style={{ position: "absolute", zIndex: 2 }}
              h="100%"
              w="100%"
            >
              No data available for this period
            </Center>
          </>
        )}

        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            width={500}
            height={420}
            data={hasData ? cleanedData : []}
            margin={{
              top: 10,
              right: 0,
              left: 0,
              bottom: 10,
            }}
          >
            {hasData && (
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                opacity={0.5}
                vertical={false}
              />
            )}
            <XAxis
              dataKey="date"
              tick={({ x, y, payload, index }) => {
                return (
                  <CustomizedAxisTick
                    x={x}
                    y={y}
                    payload={payload}
                    index={index}
                    data={cleanedData}
                    granularity={granularity}
                  />
                )
              }}
              interval={0}
              ticks={[
                // only show the first and last tick
                cleanedData[0]?.date,
                cleanedData[cleanedData.length - 1]?.date,
              ]}
              padding={{ left: 0, right: 0 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              formatter={formatter}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <Card shadow="md" withBorder>
                      <Title order={3} size="sm">
                        {formatDate(label, granularity)}
                      </Title>
                      {payload.map(
                        (item, i) =>
                          item.value !== 0 && (
                            <Text key={i}>{`${item.name}: ${formatter(
                              item.value,
                            )}`}</Text>
                          ),
                      )}
                    </Card>
                  )
                }

                return null
              }}
            />

            {cleanedData[0] &&
              Object.keys(cleanedData[0])
                .filter((prop) => prop !== "date")
                .map((prop, i) => (
                  <Fragment key={prop}>
                    <defs key={prop}>
                      <linearGradient
                        color={theme.colors[colors[i % colors.length]][6]}
                        id={slugify(prop)}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="currentColor"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="currentColor"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      color={theme.colors[colors[i % colors.length]][4]}
                      dataKey={prop}
                      stackId="1"
                      stroke="currentColor"
                      dot={false}
                      fill={`url(#${slugify(prop)})`}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </Fragment>
                ))}

            {chartExtra}
          </AreaChart>
        </ResponsiveContainer>
      </Box>
      <style jsx>{`
        :global(.lineChart .mantine-Alert-title) {
          justify-content: center;
        }
      `}</style>
    </Card>
  )
}

const LineChart = (props: LineChartProps) => (
  <ErrorBoundary>
    <LineChartComponent {...props} />
  </ErrorBoundary>
)

export default LineChart
