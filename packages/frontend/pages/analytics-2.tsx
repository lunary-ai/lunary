// Analytics2.jsx
import { useState } from "react";
import Sentiment from "@/components/analytics/Charts/Sentiment";
import TopTopics from "@/components/analytics/Charts/TopTopics";
import { SimpleGrid, Button, Group, Title } from "@mantine/core";
import DynamicChart from "@/components/analytics/Charts/DynamicChart";
import { useLocalStorage } from "@mantine/hooks";
import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import ReactWordcloud from "react-wordcloud";

const words = [
  {
    text: "word1",
    value: 64,
  },
  {
    text: "word2",
    value: 11,
  },
  {
    text: "word3",
    value: 16,
  },
  {
    text: "wor4",
    value: 17,
  },
  {
    text: "word5",
    value: 10,
  },
  {
    text: "word6",
    value: 54,
  },
  {
    text: "word7",
    value: 12,
  },
  {
    text: "word8",
    value: 77,
  },
  {
    text: "word9",
    value: 45,
  },
  {
    text: "word10",
    value: 19,
  },
  {
    text: "word11",
    value: 13,
  },
  {
    text: "word12",
    value: 32,
  },
  {
    text: "word13",
    value: 22,
  },
  {
    text: "word14",
    value: 35,
  },
  {
    text: "word15",
    value: 24,
  },
  {
    text: "word16",
    value: 38,
  },
  {
    text: "word17",
    value: 70,
  },
  {
    text: "word18",
    value: 26,
  },
  {
    text: "word19",
    value: 14,
  },
  {
    text: "word20",
    value: 29,
  },
  {
    text: "word21",
    value: 41,
  },
  {
    text: "word22",
    value: 49,
  },
  {
    text: "word23",
    value: 20,
  },
  {
    text: "word24",
    value: 59,
  },
  {
    text: "word25",
    value: 49,
  },
  {
    text: "word26",
    value: 45,
  },
  {
    text: "word27",
    value: 11,
  },
  {
    text: "word28",
    value: 22,
  },
  {
    text: "word29",
    value: 12,
  },
  {
    text: "word30",
    value: 38,
  },
  {
    text: "word31",
    value: 54,
  },
  {
    text: "31",
    value: 14,
  },
];

export default function Analytics2() {
  const [charts, setCharts] = useLocalStorage({
    key: "charts",
    defaultValue: [],
    getInitialValueInEffect: false,
  });

  // Function to add a new chart
  const addChart = () => {
    setCharts((prevCharts) => [
      ...prevCharts,
      {
        id: Date.now(),
        splitBy: "Department",
        groupBy: "Month",
        metric: "Sales", // Default metric
      },
    ]);
  };

  // Function to update chart configuration
  const updateChartConfig = (id, newConfig) => {
    setCharts((prevCharts) =>
      prevCharts.map((chart) =>
        chart.id === id ? { ...chart, ...newConfig } : chart,
      ),
    );
  };

  // Function to remove a chart
  const removeChart = (id) => {
    setCharts((prevCharts) => prevCharts.filter((chart) => chart.id !== id));
  };

  return (
    <div>
      {/* Add Chart Button */}
      <Group position="right" mb="md">
        <Button onClick={addChart}>Add New Chart</Button>
      </Group>

      {/* Render Charts */}
      <SimpleGrid cols={2} spacing="md">
        {/* Existing Static Charts */}
        <TopTopics />
        <Sentiment />
        {/* <AnalyticsCard>
          <Title order={4}>Feedback Comments</Title>
          <ReactWordcloud words={words} />
        </AnalyticsCard> */}

        {/* Dynamic Charts */}
        {charts.map((chart) => (
          <DynamicChart
            key={chart.id}
            chartConfig={chart}
            onUpdateConfig={(newConfig) =>
              updateChartConfig(chart.id, newConfig)
            }
            onRemove={() => removeChart(chart.id)}
          />
        ))}
      </SimpleGrid>
    </div>
  );
}
