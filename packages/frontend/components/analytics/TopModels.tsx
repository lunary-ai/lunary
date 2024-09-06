import { formatCost, formatLargeNumber } from "@/utils/format";
import AnalyticsCard from "./AnalyticsCard";
import BarList from "./BarList";
import { Center, Flex, Loader, Overlay } from "@mantine/core";

interface TopModel {
  name: string;
  cost: number;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
}

interface TopModelsProps {
  topModels: TopModel[];
  isLoading: boolean;
}

function TopModels({ topModels, isLoading }: TopModelsProps) {
  if (isLoading) {
    return (
      <Flex align="center" justify="center" h="280px">
        <Loader />
      </Flex>
    );
  }

  if (topModels?.length === 0) {
    return (
      <>
        <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
        <Center ta="center" h="100%" w="100%">
          No data available for this period
        </Center>
      </>
    );
  }

  return (
    <BarList
      data={topModels.map((model) => ({
        value: model.name,
        tokens: model.totalTokens,
        cost: model.cost,
        barSections: [
          {
            value: "Completion",
            tooltip: "Completion Tokens",
            count: model.completionTokens,
            color: "var(--mantine-color-blue-4)",
          },
          {
            value: "Prompt",
            tooltip: "Prompt Tokens",
            count: model.promptTokens,
            color: "var(--mantine-color-cyan-3)",
          },
        ],
      }))}
      columns={[
        {
          name: "Model",
          bar: true,
          key: "model",
        },
        {
          name: "Tokens",
          key: "tokens",
          main: true,
          render: formatLargeNumber,
        },
        {
          name: "Cost",
          key: "cost",
          render: formatCost,
        },
      ]}
    />
  );
}

export default function TopModelsCard({
  topModels,
  isLoading,
}: TopModelsProps) {
  return (
    <AnalyticsCard title="Top Models">
      <TopModels topModels={topModels} isLoading={isLoading} />
    </AnalyticsCard>
  );
}
