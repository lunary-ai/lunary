import { AreaChart, ChartTooltip } from "@mantine/charts";

const COLOR_PALETTE = [
  "violet.6",
  "blue.6",
  "green.6",
  "red.6",
  "orange.6",
  "teal.6",
  "purple.6",
  "yellow.6",
  "pink.6",
  "cyan.6",
];

type InputData = {
  date: string;
  value: number;
  name: string | null;
};

type TransformedData = {
  date: string;
  [key: string]: string | number;
};

type Series = {
  name: string;
  color: string;
};

interface AreaChartProps {
  data: InputData[];
}

function transformData(data: InputData[]): TransformedData[] {
  const nameValues = data.reduce(
    (acc, item) => {
      if (item.name && item.value !== 0) {
        acc[item.name] = true;
      }
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const relevantNames = Object.keys(nameValues);

  return Object.values(
    data.reduce(
      (acc, item) => {
        const date = item.date;
        if (!acc[date]) {
          acc[date] = {
            date,
            ...Object.fromEntries(relevantNames.map((name) => [name, 0])),
          };
        }
        if (item.name) {
          acc[date][item.name] = item.value;
        }
        return acc;
      },
      {} as Record<string, TransformedData>,
    ),
  );
}

function generateSeries(data: TransformedData[]): Series[] {
  const keys = Object.keys(data[0]).filter((key) => key !== "date");
  const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b));

  return sortedKeys.map((name, index) => ({
    name,
    color: COLOR_PALETTE[index] || "gray.6",
  }));
}

export default function AreaChartComponent({ data }: AreaChartProps) {
  const formattedData = transformData(data);
  const series = generateSeries(formattedData);

  return (
    <AreaChart
      h="260"
      data={formattedData}
      dataKey="date"
      series={series}
      withDots={false}
      withYAxis={false}
      tooltipProps={{
        content: ({ label, payload }) => {
          return <ChartTooltip label={label} payload={payload} />;
        },
      }}
    />
  );
}
