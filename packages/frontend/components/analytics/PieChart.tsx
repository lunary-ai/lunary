import { PieChart as MantinePieChart } from "@mantine/charts";
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

import { getColorFromSeed } from "@/utils/colors";
import { formatLargeNumber, getFlagEmoji } from "@/utils/format";
import { getFilteredChartTooltipPayload } from "@mantine/charts";
import { IconBolt } from "@tabler/icons-react";
import { openUpgrade } from "../layout/UpgradeModal";
import AnalyticsCard from "./AnalyticsCard";

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
            {item.name}: {item.value}
          </Text>
        ))}
    </Paper>
  );
}

type PieChartData = {
  name: string;
  color: string;
  value: number;
}[];

type PieChartProps = {
  data: PieChartData;
  title: string | JSX.Element;
  props: string[];
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
function PieChartComponent({
  data,
  props,
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
}: PieChartProps) {
  // TODO: Some handler function dependeing on what the server sends back
  let cleanedData = data;

  if (data?.length) {
    cleanedData = data.map((item) => ({
      name: `${getFlagEmoji(item[props[0]])} ${item[props[0]]}`,
      value: item[props[1]],
      color: getColorFromSeed(item[props[0]]),
    }));

    // Calculate sum and threshold
    const sum = cleanedData.reduce((acc, item) => acc + item.value, 0);
    const threshold = sum * 0.05;

    const significantItems = cleanedData.filter(
      (item) => item.value >= threshold,
    );
    const smallItems = cleanedData.filter((item) => item.value < threshold);

    const otherSum = smallItems.reduce((acc, item) => acc + item.value, 0);

    cleanedData = [
      ...significantItems,
      {
        name: "Other",
        value: otherSum,
      },
    ];
  }

  const hasData = blocked ? true : cleanedData?.length;
  // (splitBy ? Object.keys(cleanedData[0]).length > 1 : data?.length)
  const total =
    (hasData && stat === undefined) || stat === null
      ? getFigure(agg, cleanedData, "value")
      : stat;

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
          <MantinePieChart
            size={160}
            data={cleanedData || []}
            withLabels
            labelsPosition="inside"
            labelsType="percent"
            withTooltip

            // tooltipProps={{
            //   content: ({ label, payload }) => (
            //     <ChartTooltip label={label} payload={payload} />
            //   ),
            // }}
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

const PieChart = (props: PieChartProps) => (
  <AnalyticsCard
    title={props.title}
    description={props.description}
    {...props.extraProps}
  >
    <PieChartComponent {...props} />
  </AnalyticsCard>
);

export default PieChart;
