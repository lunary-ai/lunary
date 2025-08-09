import {
  Alert,
  Box,
  Button,
  Center,
  Loader,
  Overlay,
  Paper,
  Text,
} from "@mantine/core";
import { ResponsiveContainer } from "recharts";

import { formatLargeNumber } from "@/utils/format";
import { AreaChart, getFilteredChartTooltipPayload } from "@mantine/charts";
import { IconBolt } from "@tabler/icons-react";
import {
  eachDayOfInterval,
  eachHourOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
} from "date-fns";
import { useMemo } from "react";
import { openUpgrade } from "../layout/UpgradeModal";
import { generateSeries } from "./ChartCreator";
import { Granularity } from "./DateRangeGranularityPicker";

interface ChartTooltipProps {
  label: string;
  payload: Record<string, any>[] | undefined;
}

function ChartTooltip({ label, payload }: ChartTooltipProps) {
  if (!payload) return null;

  if (
    payload.filter(({ value }) => typeof value === "number" && value !== 0)
      .length === 0
  ) {
    return null;
  }

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md">
      <Text fw={500} mb={5}>
        {label}
      </Text>
      {getFilteredChartTooltipPayload(payload)
        .filter((item) => typeof item.value === "number" && item.value !== 0)
        .map((item: any) => (
          <Text key={item.name} c={item.color} fz="sm">
            {item.name}: {formatLargeNumber(item.value)}
          </Text>
        ))}
    </Paper>
  );
}

function prepareDataForRecharts(
  data: any[],
  splitBy: string | undefined,
  props: string[],
  startDate: Date,
  endDate: Date,
  granularity: "daily" | "hourly" | "weekly",
): any[] {
  const output: any[] = [];

  if (!data) data = [];

  const uniqueSplitByValues = getUniqueSplitByValues(data, splitBy);
  const interval = getIntervalFunction(granularity);

  interval({ start: startDate, end: endDate }).forEach((date) => {
    const formattedDate = formatDateForGranularity(date, granularity);
    const dayData: { [key: string]: any } = { date: formattedDate };

    props.forEach((prop) => {
      if (splitBy) {
        uniqueSplitByValues.forEach((splitByValue) => {
          dayData[`${splitByValue || "(unknown)"} ${prop}`] = findDataValue(
            data,
            splitBy,
            splitByValue,
            formattedDate,
            granularity,
            prop,
          );
        });
      } else {
        dayData[prop] = findDataValue(
          data,
          undefined,
          undefined,
          formattedDate,
          granularity,
          prop,
        );
      }
    });

    output.push(dayData);
  });

  return output.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function getUniqueSplitByValues(
  data: any[],
  splitBy: string | undefined,
): string[] {
  return splitBy
    ? Array.from(new Set(data.map((item) => item[splitBy]?.toString())))
    : [];
}

function getIntervalFunction(granularity: "daily" | "hourly" | "weekly") {
  return granularity === "daily"
    ? eachDayOfInterval
    : granularity === "hourly"
      ? eachHourOfInterval
      : eachWeekOfInterval;
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
  );
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
  );
}

function getDateFormat(granularity: "daily" | "hourly" | "weekly"): string {
  return granularity === "daily"
    ? "yyyy-MM-dd"
    : granularity === "hourly"
      ? "yyyy-MM-dd'T'HH"
      : "yyyy-'W'ww";
}

const formatDate = (date, granularity: Granularity) => {
  if (!date) return;
  switch (granularity) {
    case "daily":
      return format(parseISO(date), "MMM do");
    case "hourly":
      return format(parseISO(date), "eee, HH'h'");
    case "weekly":
      return format(parseISO(date), "MMM d");
  }
};

const CustomizedAxisTick = ({ x, y, payload, index, data, granularity }) => {
  // // Hide the first and last tick
  // if (index === 0 || index === data.length - 1) {
  //   return null
  // }

  // offset the first and last tick to make it look better
  const offset = index === 0 ? 42 : index === 1 ? -42 : 0;

  return (
    <g transform={`translate(${x + offset},${y})`}>
      <text x={0} y={0} dy={16} textAnchor={"middle"} fill="#666" opacity={0.8}>
        {formatDate(payload.value, granularity)}
      </text>
    </g>
  );
};

type LineChartData = {
  date: string;
  [key: string]: any;
}[];

type LineChartProps = {
  data: LineChartData;
  title: string | JSX.Element;
  props?: string[];
  blocked?: boolean;
  formatter?: (value: number) => string;
  height?: number;
  loading?: boolean;
  splitBy?: string;

  description?: string;
  startDate: Date;
  endDate: Date;
  granularity: "daily" | "hourly" | "weekly";
  agg: string;
  chartExtra?: JSX.Element;
  stat?: number;
  colors?: string[];
  cleanData?: boolean;

  extraProps: any;
};

function getFigure(agg: string, data: any[], prop: string) {
  const propKeys = Object.keys(data[0] || {}).filter((key) =>
    key.includes(prop),
  );

  if (agg === "sum") {
    return data.reduce((acc, item) => {
      propKeys.forEach((key) => (acc += item[key] ?? 0));
      return acc;
    }, 0);
  } else if (agg === "avg") {
    const filteredData = data.filter((item) => item[prop] !== 0);
    return (
      filteredData.reduce((acc, item) => {
        propKeys.forEach((key) => (acc += item[key] ?? 0));
        return acc;
      }, 0) / filteredData.length || 0
    );
  } else if (agg === "max") {
    return data.reduce((acc, item) => {
      propKeys.forEach((key) => (acc = Math.max(acc, item[key] ?? -Infinity)));
      return acc;
    }, -Infinity);
  } else if (agg === "min") {
    return data.reduce((acc, item) => {
      propKeys.forEach((key) => (acc = Math.min(acc, item[key] ?? Infinity)));
      return acc;
    }, Infinity);
  }
  return 0;
}
export default function LineChartComponent({
  data,
  props = ["value"],
  blocked = false,
  formatter = formatLargeNumber,
  height = 230,
  loading = false,
  splitBy = undefined,
  startDate,
  endDate,
  granularity,
  agg,
  chartExtra,
  stat,
  cleanData = true,
  colors = ["blue", "pink", "indigo", "green", "violet", "yellow"],
}: LineChartProps) {
  let cleanedData = prepareDataForRecharts(
    blocked
      ? ((
          startDate: Date,
          endDate: Date,
          granularity: "daily" | "hourly" | "weekly",
        ): LineChartData => {
          const data: LineChartData = [];
          const interval =
            granularity === "daily"
              ? eachDayOfInterval
              : granularity === "hourly"
                ? eachHourOfInterval
                : eachWeekOfInterval;
          interval({ start: startDate, end: endDate }).forEach((date) => {
            const users = Math.floor(Math.random() * 6000) + 4000;
            data.push({
              date: date.toISOString(),
              users: users,
            });
          });
          return data;
        })(startDate, endDate, granularity)
      : data,
    splitBy,
    props,
    startDate,
    endDate,
    granularity,
  );

  if (cleanData === false && data?.length) {
    cleanedData = data;
  }

  const hasData = blocked ? true : cleanedData?.length;
  // (splitBy ? Object.keys(cleanedData[0]).length > 1 : data?.length)
  const total =
    stat === undefined || stat === null
      ? getFigure(agg, cleanedData, props[0])
      : stat;

  const series = useMemo(() => {
    if (!cleanedData || cleanedData.length === 0) {
      return [];
    }

    const seriesSet = new Set<string>();
    cleanedData.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (key !== "value") {
          seriesSet.add(key);
        }
      });
    });

    const seriesNames = Array.from(seriesSet);

    return generateSeries(seriesNames);
  }, [cleanedData]);

  return (
    <>
      {loading && (
        <>
          <Overlay
            h="100%"
            blur={5}
            backgroundOpacity={0.05}
            p="lg"
            zIndex={2}
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
        <Text fw={500} fz={24} ml="md">
          {formatter(total)}
        </Text>
      )}

      <Box mt="sm" pos="relative">
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
            h={300}
            data={cleanedData || []}
            dataKey="date"
            type="stacked"
            series={series}
            withDots={false}
            withYAxis={false}
            xAxisProps={{
              tick: ({ x, y, payload, index }) => (
                <CustomizedAxisTick
                  x={x}
                  y={y}
                  payload={payload}
                  index={index}
                  data={cleanedData}
                  granularity={granularity}
                />
              ),
              interval: 0,
              ticks: [
                // only show the first and last tick
                cleanedData[0]?.date,
                cleanedData[cleanedData.length - 1]?.date,
              ],
            }}
            tooltipProps={{
              content: ({ label, payload }) => (
                <ChartTooltip label={label} payload={payload} />
              ),
            }}
          />
        </ResponsiveContainer>
      </Box>
      <style jsx>{`
        :global(.lineChart .mantine-Alert-title) {
          justify-content: center;
        }
      `}</style>
    </>
  );
}
