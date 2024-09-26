import { BarChart } from "@mantine/charts";
import AnalyticsCard from "../AnalyticsCard";
import { Title } from "@mantine/core";

export const data = [
  { topic: "Annual Leave", frequency: 100 },
  { topic: "Company Benefits", frequency: 65 },
  { topic: "Training", frequency: 50 },
  { topic: "Expense Reporting", frequency: 30 },
  { topic: "Workplace safety", frequency: 10 },
];

export default function TopTopics() {
  return (
    <AnalyticsCard>
      <Title order={3}>Most frequent topics</Title>
      <BarChart
        mt="md"
        h={300}
        data={data}
        dataKey="topic"
        type="stacked"
        orientation="vertical"
        yAxisProps={{ width: 80 }}
        gridAxis="y"
        series={[{ name: "frequency", color: "blue.6" }]}
      />
    </AnalyticsCard>
  );
}
