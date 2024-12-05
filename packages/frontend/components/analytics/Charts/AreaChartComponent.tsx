import { AreaChart, ChartTooltip } from "@mantine/charts";

interface AreaChartComponent {
  data: any[]; // TODO: define type
}

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

function transformData(data: InputData[]): any[] {
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
      {} as Record<string, any>,
    ),
  );
}

export function generateSeries(seriesNames: string[]) {
  const sortedSeriesNames = [...seriesNames].sort((a, b) => a.localeCompare(b));

  const seriesWithColors = sortedSeriesNames.map((name, index) => ({
    name,
    color: COLOR_PALETTE[index] || "gray.6",
  }));

  return seriesWithColors;
}

export default function AreaChartComponent({ data }: AreaChartComponent) {
  const uniqueSeriesNames = [
    ...new Set(data.map((item) => item.name).filter((name) => name !== null)),
  ];

  console.log(data, transformData(data));

  return (
    <AreaChart
      h="300"
      data={transformData(data)}
      dataKey="date"
      series={generateSeries(uniqueSeriesNames)}
      withDots={false}
      tooltipProps={{
        content: ({ label, payload }) => {
          console.log(payload);
          return <ChartTooltip label={label} payload={payload} />;
        },
      }}
    />
  );
}
