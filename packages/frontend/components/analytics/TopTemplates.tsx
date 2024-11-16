import { formatCost, formatLargeNumber } from "@/utils/format";
import { Center, Flex, Loader, Overlay } from "@mantine/core";
import AnalyticsCard from "./AnalyticsCard";
import BarList from "./BarList";

interface TopTemplates {
  slug: string;
  usageCount: number;
  cost: number;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
}

interface TopTemplatesProps {
  topTemplates: TopTemplates[];
  isLoading: boolean;
}

function TopTemplates({ topTemplates, isLoading }: TopTemplatesProps) {
  if (isLoading) {
    return (
      <Flex align="center" justify="center" h="280px">
        <Loader />
      </Flex>
    );
  }

  if (topTemplates?.length === 0) {
    return (
      <>
        <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
        <Center ta="center" h="100%" w="100%">
          No templates used available for this period
        </Center>
      </>
    );
  }

  return (
    <BarList
      data={topTemplates?.map((template) => ({
        value: template.slug,
        usage: template.usageCount,
        tokens: template.totalTokens,
        cost: template.cost,
        barSections: [
          {
            value: "Usage",
            tooltip: "Usage",
            count: template.usageCount,
            color: "var(--mantine-color-blue-4)",
          },
        ],
      }))}
      columns={[
        {
          key: "template",
          name: "Template",
          bar: true,
        },
        {
          name: "Usage",
          key: "usage",
          main: true,
          render: formatLargeNumber,
        },
        {
          name: "Tokens",
          key: "tokens",
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

export default function TopTemplatesCard({
  topTemplates,
  isLoading,
}: TopTemplatesProps) {
  return (
    <AnalyticsCard title="Top Templates">
      <TopTemplates topTemplates={topTemplates} isLoading={isLoading} />
    </AnalyticsCard>
  );
}
