import { formatCost, formatLargeNumber } from "@/utils/format";
import { Box, Center, Group, Overlay, Text } from "@mantine/core";
import BarList from "../BarList";

interface TopAgents {
  name: string;
  cost: number;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
}

export default function TopAgents({ data: agents }: { data: TopAgents[] }) {
  agents = agents.filter((agent) => agent.cost > 0);

  if (agents.length === 0) {
    return (
      <Center ta="center" h="100%" w="100%">
        <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
        <Text>No data available for this period</Text>
      </Center>
    );
  }

  return (
    <Box px="md">
      <BarList
        data={agents.map((agent) => ({
          value: agent.name,
          tokens: agent.totalTokens,
          cost: agent.cost,
          barSections: [
            {
              value: "Completion",
              tooltip: "Completion Tokens",
              count: agent.completionTokens,
              color: "var(--mantine-color-blue-4)",
            },
            {
              value: "Prompt",
              tooltip: "Prompt Tokens",
              count: agent.promptTokens,
              color: "var(--mantine-color-cyan-3)",
            },
          ],
        }))}
        columns={[
          {
            name: "Agent",
            bar: true,
            key: "name",
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
    </Box>
  );
}
