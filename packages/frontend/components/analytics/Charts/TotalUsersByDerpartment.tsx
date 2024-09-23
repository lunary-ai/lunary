import { useState } from "react";
import { Select } from "@mantine/core";
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

function getAllLocationsData(locationsData) {
  const months = ["May", "June", "July", "August", "September"];
  return months.map((month) => {
    let totalSales = 0;
    let totalFinances = 0;
    let totalProduct = 0;

    for (let location in locationsData) {
      const monthData = locationsData[location].find(
        (data) => data.month === month,
      );
      if (monthData) {
        totalSales += monthData.Sales;
        totalFinances += monthData.Finances;
        totalProduct += monthData.Product;
      }
    }

    return {
      month,
      Sales: totalSales,
      Finances: totalFinances,
      Product: totalProduct,
    };
  });
}

function getMaxValue(locationsData) {
  let maxValue = 0;

  // Check individual locations
  for (let location in locationsData) {
    for (let dataPoint of locationsData[location]) {
      for (let key of ["Sales", "Finances", "Product"]) {
        if (dataPoint[key] > maxValue) {
          maxValue = dataPoint[key];
        }
      }
    }
  }

  // Check aggregated data for "All Locations"
  const allLocationsData = getAllLocationsData(locationsData);
  for (let dataPoint of allLocationsData) {
    for (let key of ["Sales", "Finances", "Product"]) {
      if (dataPoint[key] > maxValue) {
        maxValue = dataPoint[key];
      }
    }
  }

  return maxValue;
}

export default function TotalUsersByDepartment() {
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  const locations = ["All Locations", "London", "Amsterdam", "Berlin"];

  const data =
    selectedLocation === "All Locations"
      ? getAllLocationsData(dataPerLocation)
      : dataPerLocation[selectedLocation];

  const maxValue = getMaxValue(dataPerLocation);

  return (
    <AnalyticsCard title="Total Users By Department">
      <Select
        data={locations}
        value={selectedLocation}
        onChange={(value) => setSelectedLocation(value)}
        label="Select Location"
        placeholder="Select Location"
        mt="md"
      />
      <BarChart
        mt="md"
        h={300}
        data={data}
        dataKey="month"
        series={[
          { name: "Sales", color: "blue.6" },
          { name: "Finances", color: "green.6" },
          { name: "Product", color: "orange.6" },
        ]}
        tickLine="y"
        yAxisProps={{ domain: [0, maxValue] }}
      />
    </AnalyticsCard>
  );
}
