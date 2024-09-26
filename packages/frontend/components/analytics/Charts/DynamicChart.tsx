// DynamicChart.jsx
import { useState, useEffect } from "react";
import { Group, Select, Title, Button, Text } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import AnalyticsCard from "../AnalyticsCard";

// data.js
// data.js

export const dataPerLocation = {
  London: [
    {
      month: "May",
      departments: {
        Sales: 500,
        Finances: 300,
        Product: 200,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 400,
          Finances: 350,
          Product: 250,
        },
        "Total Conversations": {
          Sales: 300,
          Finances: 250,
          Product: 200,
        },
        "New Users": {
          Sales: 100,
          Finances: 80,
          Product: 70,
        },
      },
    },
    {
      month: "June",
      departments: {
        Sales: 600,
        Finances: 400,
        Product: 300,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 450,
          Finances: 380,
          Product: 270,
        },
        "Total Conversations": {
          Sales: 320,
          Finances: 260,
          Product: 220,
        },
        "New Users": {
          Sales: 110,
          Finances: 90,
          Product: 80,
        },
      },
    },
    {
      month: "July",
      departments: {
        Sales: 700,
        Finances: 500,
        Product: 400,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 500,
          Finances: 400,
          Product: 300,
        },
        "Total Conversations": {
          Sales: 350,
          Finances: 280,
          Product: 240,
        },
        "New Users": {
          Sales: 120,
          Finances: 100,
          Product: 90,
        },
      },
    },
    {
      month: "August",
      departments: {
        Sales: 800,
        Finances: 600,
        Product: 500,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 550,
          Finances: 430,
          Product: 320,
        },
        "Total Conversations": {
          Sales: 380,
          Finances: 300,
          Product: 260,
        },
        "New Users": {
          Sales: 130,
          Finances: 110,
          Product: 100,
        },
      },
    },
    {
      month: "September",
      departments: {
        Sales: 900,
        Finances: 700,
        Product: 600,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 600,
          Finances: 460,
          Product: 350,
        },
        "Total Conversations": {
          Sales: 400,
          Finances: 320,
          Product: 280,
        },
        "New Users": {
          Sales: 140,
          Finances: 120,
          Product: 110,
        },
      },
    },
  ],
  Amsterdam: [
    {
      month: "May",
      departments: {
        Sales: 400,
        Finances: 200,
        Product: 100,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 350,
          Finances: 180,
          Product: 90,
        },
        "Total Conversations": {
          Sales: 280,
          Finances: 150,
          Product: 80,
        },
        "New Users": {
          Sales: 90,
          Finances: 60,
          Product: 40,
        },
      },
    },
    {
      month: "June",
      departments: {
        Sales: 500,
        Finances: 300,
        Product: 200,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 380,
          Finances: 220,
          Product: 120,
        },
        "Total Conversations": {
          Sales: 300,
          Finances: 180,
          Product: 100,
        },
        "New Users": {
          Sales: 100,
          Finances: 70,
          Product: 50,
        },
      },
    },
    {
      month: "July",
      departments: {
        Sales: 600,
        Finances: 400,
        Product: 300,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 410,
          Finances: 250,
          Product: 150,
        },
        "Total Conversations": {
          Sales: 320,
          Finances: 200,
          Product: 120,
        },
        "New Users": {
          Sales: 110,
          Finances: 80,
          Product: 60,
        },
      },
    },
    {
      month: "August",
      departments: {
        Sales: 700,
        Finances: 500,
        Product: 400,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 440,
          Finances: 280,
          Product: 180,
        },
        "Total Conversations": {
          Sales: 340,
          Finances: 220,
          Product: 140,
        },
        "New Users": {
          Sales: 120,
          Finances: 90,
          Product: 70,
        },
      },
    },
    {
      month: "September",
      departments: {
        Sales: 800,
        Finances: 600,
        Product: 500,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 470,
          Finances: 310,
          Product: 210,
        },
        "Total Conversations": {
          Sales: 360,
          Finances: 240,
          Product: 160,
        },
        "New Users": {
          Sales: 130,
          Finances: 100,
          Product: 80,
        },
      },
    },
  ],
  Berlin: [
    {
      month: "May",
      departments: {
        Sales: 300,
        Finances: 100,
        Product: 50,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 280,
          Finances: 90,
          Product: 40,
        },
        "Total Conversations": {
          Sales: 220,
          Finances: 70,
          Product: 30,
        },
        "New Users": {
          Sales: 80,
          Finances: 50,
          Product: 20,
        },
      },
    },
    {
      month: "June",
      departments: {
        Sales: 400,
        Finances: 200,
        Product: 150,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 310,
          Finances: 120,
          Product: 70,
        },
        "Total Conversations": {
          Sales: 240,
          Finances: 90,
          Product: 50,
        },
        "New Users": {
          Sales: 90,
          Finances: 60,
          Product: 30,
        },
      },
    },
    {
      month: "July",
      departments: {
        Sales: 500,
        Finances: 300,
        Product: 250,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 340,
          Finances: 150,
          Product: 100,
        },
        "Total Conversations": {
          Sales: 260,
          Finances: 110,
          Product: 70,
        },
        "New Users": {
          Sales: 100,
          Finances: 70,
          Product: 40,
        },
      },
    },
    {
      month: "August",
      departments: {
        Sales: 600,
        Finances: 400,
        Product: 350,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 370,
          Finances: 180,
          Product: 130,
        },
        "Total Conversations": {
          Sales: 280,
          Finances: 130,
          Product: 90,
        },
        "New Users": {
          Sales: 110,
          Finances: 80,
          Product: 50,
        },
      },
    },
    {
      month: "September",
      departments: {
        Sales: 700,
        Finances: 500,
        Product: 450,
      },
      metricsByDepartment: {
        "Total Users": {
          Sales: 400,
          Finances: 210,
          Product: 160,
        },
        "Total Conversations": {
          Sales: 300,
          Finances: 150,
          Product: 110,
        },
        "New Users": {
          Sales: 120,
          Finances: 90,
          Product: 60,
        },
      },
    },
  ],
};
// constants.js
export const months = ["May", "June", "July", "August", "September"];
export const locations = ["London", "Amsterdam", "Berlin"];
export const departments = ["Sales", "Finances", "Product"];
export const metrics = ["Total Users", "Total Conversations", "New Users"];
export const allMetrics = ["Sales", "Finances", "Product", ...metrics];

export const metricToAvailableDimensions = {
  Sales: ["Location", "Month"],
  Finances: ["Location", "Month"],
  Product: ["Location", "Month"],
  "Total Users": ["Department", "Location", "Month"],
  "Total Conversations": ["Department", "Location", "Month"],
  "New Users": ["Department", "Location", "Month"],
};

export const colorMap = {
  Sales: "blue",
  Finances: "green",
  Product: "orange",
  "Total Users": "teal",
  "Total Conversations": "cyan",
  "New Users": "pink",
  London: "indigo",
  Amsterdam: "lime",
  Berlin: "violet",
  May: "gray",
  June: "blue",
  July: "green",
  August: "orange",
  September: "red",
};

// Function to flatten the data
export function flattenData(locationsData) {
  const result = [];

  for (const location in locationsData) {
    const monthlyData = locationsData[location];
    for (const monthData of monthlyData) {
      const month = monthData.month;

      // Department metrics (Sales, Finances, Product)
      for (const department of departments) {
        const value = monthData.departments[department];
        result.push({
          location,
          month,
          department,
          metric: department,
          value,
        });

        // Additional metrics by department
        for (const metric of metrics) {
          const metricValue = monthData.metricsByDepartment[metric][department];
          result.push({
            location,
            month,
            department,
            metric,
            value: metricValue,
          });
        }
      }

      // Other metrics not broken down by department
      // (If any exist, you can process them here)
    }
  }

  return result;
}

// Function to generate chart data
export function generateChartData(flatData, splitBy, groupBy, metric) {
  const splitValues =
    splitBy === "Department"
      ? departments
      : splitBy === "Location"
        ? locations
        : months;

  const groups =
    groupBy === "Department"
      ? departments
      : groupBy === "Location"
        ? locations
        : months;

  const chartData = groups.map((group) => {
    const dataPoint = { [groupBy.toLowerCase()]: group };
    for (const splitValue of splitValues) {
      const totalValue = flatData.reduce((sum, item) => {
        const splitByValue =
          splitBy === "Department"
            ? item.department
            : item[splitBy.toLowerCase()];
        const groupByValue =
          groupBy === "Department"
            ? item.department
            : item[groupBy.toLowerCase()];

        if (
          item.metric === metric &&
          splitByValue === splitValue &&
          groupByValue === group
        ) {
          return sum + item.value;
        }
        return sum;
      }, 0);
      dataPoint[splitValue] = totalValue;
    }
    return dataPoint;
  });

  return chartData;
}
// Function to get maximum value
export function getMaxValue(chartData, splitValues) {
  let maxValue = 0;
  for (const dataPoint of chartData) {
    for (const splitValue of splitValues) {
      const value = dataPoint[splitValue];
      if (value > maxValue) {
        maxValue = value;
      }
    }
  }
  return maxValue;
}

export default function DynamicChart({
  chartConfig,
  onUpdateConfig,
  onRemove,
}) {
  const {
    splitBy: initialSplitBy,
    groupBy: initialGroupBy,
    metric: initialMetric,
  } = chartConfig;

  const [metric, setMetric] = useState(initialMetric || "Sales");
  const [availableDimensions, setAvailableDimensions] = useState(
    metricToAvailableDimensions[metric],
  );

  const [splitBy, setSplitBy] = useState(
    initialSplitBy || availableDimensions[0],
  );
  const [groupBy, setGroupBy] = useState(
    initialGroupBy ||
      availableDimensions.find((dim) => dim !== splitBy) ||
      availableDimensions[0],
  );

  // Update available dimensions when metric changes
  useEffect(() => {
    const dimensions = metricToAvailableDimensions[metric];
    setAvailableDimensions(dimensions);

    if (!dimensions?.includes(splitBy)) {
      setSplitBy(dimensions[0]);
    }

    if (!dimensions?.includes(groupBy) || splitBy === groupBy) {
      const alternative = dimensions.find((dim) => dim !== splitBy);
      setGroupBy(alternative || dimensions[0]);
    }
  }, [metric]);

  // Prevent selecting the same value for splitBy and groupBy
  useEffect(() => {
    if (splitBy === groupBy) {
      const alternative = availableDimensions.find((dim) => dim !== splitBy);
      setGroupBy(alternative || groupBy);
    }
  }, [splitBy, availableDimensions]);

  // Update parent component with new config when splitBy, groupBy, or metric changes
  useEffect(() => {
    onUpdateConfig({ splitBy, groupBy, metric });
  }, [splitBy, groupBy, metric]);

  // Flatten the data
  const flatData = flattenData(dataPerLocation);

  // Generate the chart data
  const chartData = generateChartData(flatData, splitBy, groupBy, metric);

  // Generate the series
  const splitValues =
    splitBy === "Department"
      ? departments
      : splitBy === "Location"
        ? locations
        : months;

  const series = splitValues.map((splitValue) => ({
    name: splitValue,
    color: colorMap[splitValue],
  }));

  // Get the maximum value for the Y-axis
  const maxValue = getMaxValue(chartData, splitValues);

  // Check if there's any data to display
  const hasData = chartData.some((dataPoint) =>
    splitValues.some((splitValue) => dataPoint[splitValue] > 0),
  );

  return (
    <AnalyticsCard>
      <Group position="apart" align="center">
        <Group justify="space-between" w="100%">
          <Title order={4}>
            {metric} by {splitBy}
          </Title>
          <Button variant="subtle" color="red" onClick={onRemove}>
            Remove
          </Button>
        </Group>
        <Group spacing="xs">
          {/* Metric Selector */}
          <Select
            data={allMetrics}
            value={metric}
            onChange={setMetric}
            placeholder="Select Metric"
            label="Metric"
          />
          {/* Split By Selector */}
          <Select
            data={availableDimensions}
            value={splitBy}
            onChange={setSplitBy}
            placeholder="Split By"
            label="Split By"
          />
          {/* Group By Selector */}
          <Select
            data={availableDimensions.filter((option) => option !== splitBy)}
            value={groupBy}
            onChange={setGroupBy}
            placeholder="Group By"
            label="Group By"
          />
        </Group>
      </Group>
      {/* Chart Component */}
      {hasData ? (
        <BarChart
          mt="md"
          h={300}
          data={chartData}
          dataKey={groupBy.toLowerCase()}
          series={series}
          tickLine="y"
          yAxisProps={{ domain: [0, maxValue] }}
        />
      ) : (
        <Text mt="md">No data available for the selected configuration.</Text>
      )}
    </AnalyticsCard>
  );
}
