import { formatCost, formatLargeNumber } from "@/utils/format";
import BarList from "./BarList";
import { Box } from "@mantine/core";

interface TopTemplates {
  slug: string;
  id: number;
  usageCount: number;
  cost: number;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
}

export default function TopTemplates({ data }: { data: TopTemplates[] }) {
  return (
    <Box px="md">
      <BarList
        data={data?.map((template) => ({
          value: template.slug,
          url: `/logs?filters=templates=${template.id}`,
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
    </Box>
  );
}
