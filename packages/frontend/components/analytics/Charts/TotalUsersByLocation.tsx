import { BarChart } from "@mantine/charts";
import AnalyticsCard from "../AnalyticsCard";

const data = [
  { month: "May", London: 1200, Amsterdam: 900, Berlin: 200 },
  { month: "June", London: 1900, Amsterdam: 1200, Berlin: 400 },
  { month: "July", London: 400, Amsterdam: 1000, Berlin: 200 },
  { month: "August", London: 1000, Amsterdam: 200, Berlin: 800 },
  { month: "September", London: 800, Amsterdam: 1400, Berlin: 1200 },
];

export default function TotalUsersByLocation() {
  return (
    <AnalyticsCard title="Total Users By Location">
      <BarChart
        mt="md"
        h={300}
        data={data}
        dataKey="month"
        series={[
          { name: "London", color: "blue.6" },
          { name: "Amsterdam", color: "red.6" },
          { name: "Berlin", color: "yellow.6" },
        ]}
        tickLine="y"
      />
    </AnalyticsCard>
  );
}
