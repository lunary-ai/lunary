import { useAnalyticsChartData } from "@/utils/dataHooks/analytics";
import { Box, Center, Flex, Loader, Overlay } from "@mantine/core";
import TopModels from "./TopModels";
import TopTemplates from "../TopTemplates";
import TopUsers from "../TopUsers";
import LineChartComponent from "../OldLineChart";
import AreaChartComponent from "./AreaChartComponent";

interface ChartProps {
  id: string;
}

export default function ChartComponent({
  id,
  dataKey,
  startDate,
  endDate,
  granularity,
}) {
  let { data, isLoading } = useAnalyticsChartData<any>(
    dataKey,
    startDate,
    endDate,
    granularity,
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
      <Box>
        <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
        <Center ta="center" h="100%" w="100%">
          No data available for this period
        </Center>
      </Box>
    );
  }

  if (id === "models/top") {
    return <TopModels data={data} />;
  }

  if (id === "templates/top") {
    return <TopTemplates data={data} />;
  }

  if (id === "users/top") {
    return <TopUsers data={data} />;
  }

  if (id === "tokens") {
    console.log(data);
    // return "Tokens";
    return <AreaChartComponent data={data} />;
  }

  return "No chart available";
}
