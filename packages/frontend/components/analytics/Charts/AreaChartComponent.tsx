import { AreaChart, ChartTooltip } from "@mantine/charts";
import { Box, Text } from "@mantine/core";
import { format, parseISO } from "date-fns";
import { Granularity } from "../Creator";
import { formatLargeNumber } from "@/utils/format";

const COLOR_PALETTE = [
  "violet.6",
  "blue.6",
  "green.6",
  "red.6",
  "orange.6",
  "teal.6",
  "violet.7",
  "yellow.6",
  "pink.6",
  "cyan.6",
  "indigo.6",
  "lime.6",
  "grape.6",
  "blue.7",
  "teal.7",
  "red.7",
  "orange.7",
  "pink.7",
  "green.7",
  "cyan.7",
];

type InputData = {
  date: string;
  value: number;
  name: string | null;
};

type TransformedData = {
  date: string;
  [key: string]: string | number;
};

type Series = {
  name: string;
  color: string;
};

function transformData(data: InputData[]): TransformedData[] {
  const nameValues = data.reduce(
    (acc, item) => {
      if (item.name && item.value !== 0) {
        acc[item.name] = true;
      }
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const relevantNames = Object.keys(nameValues);

  return Object.values(
    data.reduce(
      (acc, item) => {
        const date = item.date;
        if (!acc[date]) {
          acc[date] = {
            date,
            ...Object.fromEntries(relevantNames.map((name) => [name, 0])),
          };
        }
        if (item.name) {
          acc[date][item.name] = item.value;
        }
        return acc;
      },
      {} as Record<string, TransformedData>,
    ),
  );
}

function generateSeries(
  data: TransformedData[],
  color?: string | null,
): Series[] {
  const keys = Object.keys(data[0]).filter((key) => key !== "date");
  const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b));

  return sortedKeys.map((name, index) => ({
    name,
    color: color || COLOR_PALETTE[index % COLOR_PALETTE.length] || "gray.6",
  }));
}

interface AreaChartProps {
  data: InputData[];
  granularity: Granularity;
  color?: string | null;
  dataKey?: string;
  aggregationMethod?: string | null;
  stat?: number | null;
}

export default function AreaChartComponent({
  data,
  granularity,
  dataKey,
  color,
  aggregationMethod,
  stat,
}: AreaChartProps) {
  const formattedData = transformData(data);
  const series = generateSeries(formattedData, color);
  const aggValue = stat
    ? stat
    : aggregationMethod
      ? formatLargeNumber(getFigure(aggregationMethod, data, "value"))
      : null;

  return (
    <>
      <Text fw={500} fz={24} mb="md">
        {dataKey?.includes("cost") && aggValue ? `$${aggValue}` : aggValue}
      </Text>
      {!aggValue && <Box h="24px" />}
      <AreaChart
        h="230px"
        data={formattedData}
        dataKey="date"
        series={series}
        withDots={false}
        withYAxis={false}
        xAxisProps={{
          fontSize: "45px",
          tickFormatter: (value, index) => {
            if (index === 0 || index === formattedData.length - 1) {
              return formatDate(value, "daily") || "";
            }
            return "";
          },
          tickMargin: 8,
          tick: {
            fontSize: "16px",
            fill: "#666",
            opacity: 0.8,
            offset: 100,
          },
        }}
        tooltipProps={{
          content: ({ label, payload }) => {
            const filteredPayload = (payload || [])
              .filter((item: any) => item.value > 0)
              .sort((a: any, b: any) => b.value - a.value)
              .map((item) => ({
                ...item,
                value: formatLargeNumber(Number.parseInt(item.value)),
                payload: {
                  date: item.payload.date,
                  ...Object.fromEntries(
                    Object.entries(item.payload).map(([key, value]) => [
                      key,
                      typeof value === "number" && value % 1 !== 0
                        ? value.toFixed(6)
                        : value,
                    ]),
                  ),
                },
              }));

            if (filteredPayload.length === 0) {
              return null;
            }

            return (
              <ChartTooltip
                label={formatDate(label, granularity)}
                payload={filteredPayload}
              />
            );
          },
        }}
      />
    </>
  );
}

function formatDate(date, granularity) {
  if (!date) return;
  switch (granularity) {
    case "daily":
      return format(parseISO(date), "MMM do");
    case "hourly":
      return format(parseISO(date), "eee, HH'h'");
    case "weekly":
      return format(parseISO(date), "MMM d");
  }
}

// TDOO: put in a separate file
function getFigure(agg: string, data: any[], prop: string = "value") {
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