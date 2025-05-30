import { useAnalyticsChartData } from "@/utils/dataHooks/analytics";
import { BarChart } from "@mantine/charts";
import { Center, Flex, Loader, Overlay, Text } from "@mantine/core";
import { useMemo } from "react";
import { Chart, DEFAULT_CHARTS, LogicNode } from "shared";
import { generateSeries } from "../ChartCreator";
import TopLanguages from "../TopLanguages";
import TopTemplates from "../TopTemplates";
import TopTopics from "../TopTopics";
import TopUsers from "../TopUsers";
import AreaChartComponent from "./AreaChartComponent";
import TopModels from "./TopModels";
import TopAgents from "./TopAgents";
import BarChartComponent from "./BarChartComponent";

interface ChartProps {
  id: string;
  dataKey: string;
  startDate: Date;
  endDate: Date;
  granularity: "hourly" | "daily" | "weekly" | "monthly";
  checks: LogicNode;
  color?: string | null;
  primaryDimension?: string | null;
  secondaryDimension?: string | null;
  aggregationMethod?: string | null;
  isCustom?: boolean;
  chart: Chart;
}

export default function ChartComponent({
  id,
  dataKey,
  startDate,
  endDate,
  granularity,
  checks,
  color,
  primaryDimension,
  secondaryDimension,
  aggregationMethod,
  isCustom = false,
  chart,
}: ChartProps) {
  let { data, stat, isLoading } = useAnalyticsChartData<any>(
    dataKey,
    startDate,
    endDate,
    granularity,
    checks,
    primaryDimension,
    secondaryDimension,
  );

  const series = useMemo(() => {
    if (!data || !data.data || data.data.length === 0) {
      return [];
    }

    const seriesSet = new Set<string>();
    data.data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (key !== "value") {
          seriesSet.add(key);
        }
      });
    });

    const seriesNames = Array.from(seriesSet);

    return generateSeries(seriesNames);
  }, [data]);

  if (isLoading) {
    return (
      <Flex align="center" justify="center" h="280px">
        <Loader />
      </Flex>
    );
  }

  if (!Array.isArray(data)) {
    data = data?.data || [];
  }

  if (data.length === 0) {
    return (
      <Center ta="center" h="100%" w="100%">
        <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
        <Text>No data available for this period</Text>
      </Center>
    );
  }

  if (isCustom && chart.type === "bar") {
    return (
      <BarChart
        mt="32"
        h={230}
        withYAxis={false}
        data={data || []}
        dataKey="value"
        type="stacked"
        series={series}
        withLegend
        className="bar-chart"
      />
    );
  }

  if (isCustom && chart.type === "area") {
    return (
      <AreaChartComponent
        data={data}
        granularity={granularity}
        dataKey={dataKey}
        color={color}
        aggregationMethod={aggregationMethod}
        stat={stat}
      />
    );
  }

  if (dataKey === "models/top") {
    return <TopModels data={data} />;
  }

  if (dataKey === "templates/top") {
    return <TopTemplates data={data} />;
  }

  if (dataKey === "users/top") {
    return <TopUsers data={data} />;
  }

  if (dataKey === "languages/top") {
    return <TopLanguages data={data} />;
  }

  if (dataKey === "topics/top") {
    return <TopTopics data={data} />;
  }

  if (dataKey === "agents/top") {
    return <TopAgents data={data} />;
  }

  if (
    [
      "tokens",
      "costs",
      "errors",
      "users/new",
      "users/active",
      "users/average-cost",
      "threads",
      "run-types",
      "latency",
      "feedback-ratio",
      "thumbs-up",
      "feedback/thumb/up",
      "feedback/thumb/down",
      "runs",
    ].includes(dataKey)
  ) {
    if (chart?.type === "Bar") {
      return (
        <BarChartComponent
          data={data}
          granularity={granularity}
          dataKey={dataKey}
          color={DEFAULT_CHARTS[dataKey]?.color || color} // TODO: fix color not being saved properly in DB
          aggregationMethod={aggregationMethod}
          stat={stat}
        />
      );
    }
    return (
      <AreaChartComponent
        data={data}
        granularity={granularity}
        dataKey={dataKey}
        color={DEFAULT_CHARTS[dataKey]?.color || color} // TODO: fix color not being saved properly in DB
        aggregationMethod={aggregationMethod}
        stat={stat}
      />
    );
  }

  return "No chart available";
}
