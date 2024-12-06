import { useAnalyticsChartData } from "@/utils/dataHooks/analytics";
import { Box, Center, Flex, Loader, Overlay, Text } from "@mantine/core";
import TopModels from "./TopModels";
import TopTemplates from "../TopTemplates";
import TopUsers from "../TopUsers";
import LineChartComponent from "../OldLineChart";
import AreaChartComponent from "./AreaChartComponent";
import { LogicNode } from "shared";

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
}

// refactor props using by a chart object
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

  if (dataKey === "models/top") {
    return <TopModels data={data} />;
  }

  if (dataKey === "templates/top") {
    return <TopTemplates data={data} />;
  }

  if (dataKey === "users/top") {
    return <TopUsers data={data} />;
  }

  if (
    ["tokens", "costs", "errors", "users/new", "users/active"].includes(dataKey)
  ) {
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

  return "No chart available";
}
