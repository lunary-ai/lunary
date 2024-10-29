import { useState, useEffect } from "react";
import { Group, Select, Title } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import AnalyticsCard from "../AnalyticsCard";

const dataPerLocation = {
  London: [
    { month: "May", Sales: 500, Finances: 300, Product: 200 },
    { month: "June", Sales: 600, Finances: 400, Product: 300 },
    { month: "July", Sales: 700, Finances: 500, Product: 400 },
    { month: "August", Sales: 800, Finances: 600, Product: 500 },
    { month: "September", Sales: 900, Finances: 700, Product: 600 },
  ],
  Amsterdam: [
    { month: "May", Sales: 400, Finances: 200, Product: 100 },
    { month: "June", Sales: 500, Finances: 300, Product: 200 },
    { month: "July", Sales: 600, Finances: 400, Product: 300 },
    { month: "August", Sales: 700, Finances: 500, Product: 400 },
    { month: "September", Sales: 800, Finances: 600, Product: 500 },
  ],
  Berlin: [
    { month: "May", Sales: 300, Finances: 100, Product: 50 },
    { month: "June", Sales: 400, Finances: 200, Product: 150 },
    { month: "July", Sales: 500, Finances: 300, Product: 250 },
    { month: "August", Sales: 600, Finances: 400, Product: 350 },
    { month: "September", Sales: 700, Finances: 500, Product: 450 },
  ],
};

const months = ["May", "June", "July", "August", "September"];
const locations = ["London", "Amsterdam", "Berlin"];
const departments = ["Sales", "Finances", "Product"];

const colorMap = {
  Sales: "blue.6",
  Finances: "green.6",
  Product: "orange.6",
  London: "blue.6",
  Amsterdam: "green.6",
  Berlin: "orange.6",
  May: "blue.6",
  June: "green.6",
  July: "orange.6",
  August: "red.6",
  September: "purple.6",
};

// Function to flatten the data
function flattenData(locationsData) {
  const result = [];

  for (let location in locationsData) {
    const monthlyData = locationsData[location];
    for (let monthData of monthlyData) {
      const month = monthData.month;
      for (let department of departments) {
        const value = monthData[department];
        result.push({
          location,
          month,
          department,
          value,
        });
      }
    }
  }

  return result;
}

// Function to generate chart data based on splitBy and groupBy
function generateChartData(flatData, splitBy, groupBy) {
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
    for (let splitValue of splitValues) {
      const totalValue = flatData.reduce((sum, item) => {
        if (
          item[splitBy.toLowerCase()] === splitValue &&
          item[groupBy.toLowerCase()] === group
        ) {
          return sum + item.value;
        } else {
          return sum;
        }
      }, 0);
      dataPoint[splitValue] = totalValue;
    }
    return dataPoint;
  });

  return chartData;
}

// Function to get the maximum value for the Y-axis
function getMaxValue(chartData, splitValues) {
  let maxValue = 0;
  for (let dataPoint of chartData) {
    for (let splitValue of splitValues) {
      const value = dataPoint[splitValue];
      if (value > maxValue) {
        maxValue = value;
      }
    }
  }
  return maxValue;
}

export default function TotalUsersByDepartment() {
  const [splitBy, setSplitBy] = useState("Department");
  const [groupBy, setGroupBy] = useState("Month");

  const options = ["Department", "Location", "Month"];

  // Prevent selecting the same value for splitBy and groupBy
  useEffect(() => {
    if (splitBy === groupBy) {
      const alternative = options.find((option) => option !== splitBy);
      setGroupBy(alternative);
    }
  }, [splitBy]);

  // Flatten the data
  const flatData = flattenData(dataPerLocation);

  // Generate the chart data
  const chartData = generateChartData(flatData, splitBy, groupBy);

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

  return (
    <AnalyticsCard>
      <Group align="center">
        <Title order={4}>Total Users By {splitBy}</Title>
        <Group>
          {/* Split By Selector */}
          <Select
            data={options}
            value={splitBy}
            onChange={(value) => setSplitBy(value)}
            placeholder="Split By"
          />
          {/* Group By Selector */}
          <Select
            data={options.filter((option) => option !== splitBy)}
            value={groupBy}
            onChange={(value) => setGroupBy(value)}
            placeholder="Group By"
          />
        </Group>
      </Group>
      {/* Chart Component */}
      <BarChart
        mt="md"
        h={300}
        data={chartData}
        dataKey={groupBy.toLowerCase()}
        series={series}
        tickLine="y"
        yAxisProps={{ domain: [0, maxValue] }}
      />
    </AnalyticsCard>
  );
}
