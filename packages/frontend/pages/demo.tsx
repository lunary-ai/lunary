import { useAnalyticsChartData } from "@/utils/dataHooks/analytics";
import { BarChart } from "@mantine/charts";
import { useEffect, useMemo, useState } from "react";
import { Select, Container, Title, Group, Loader, Alert } from "@mantine/core";
import { useExternalUsersProps } from "@/utils/dataHooks/external-users";

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

export function generateSeries(seriesNames: string[]) {
  const sortedSeriesNames = [...seriesNames].sort((a, b) => a.localeCompare(b));

  const seriesWithColors = sortedSeriesNames.map((name, index) => ({
    name,
    color: COLOR_PALETTE[index] || "gray.6",
  }));

  return seriesWithColors;
}

const startDate = new Date("2024-10-21T16:00:00.000Z");
const endDate = new Date("2024-10-29T15:59:59.999Z");

export default function Demo() {
  const [firstDimensionKey, setFirstDimensionKey] = useState("department");
  const [secondDimensionKey, setSecondDimensionKey] = useState("date");

  const {
    data,
    isLoading: chartLoading,
    error: chartError,
  } = useAnalyticsChartData(
    "users/active",
    startDate,
    endDate,
    "daily",
    undefined,
    firstDimensionKey,
    secondDimensionKey,
  );

  // Fetch unique props keys for the project
  const { props, isLoading: usersPropsLoading } = useExternalUsersProps();

  useEffect(() => {
    setSecondDimensionKey("date");
  }, [firstDimensionKey]);

  const series = useMemo(() => {
    if (!data || !data.data || data.data.length === 0) {
      return [];
    }

    const seriesSet = new Set<string>();
    data.data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (key !== "value") {
          seriesSet.add(key);
        }
      });
    });

    const seriesNames = Array.from(seriesSet);

    return generateSeries(seriesNames);
  }, [data]);

  if (chartLoading) {
    return (
      <Container>
        <Loader variant="dots" />
        <div>Loading chart data...</div>
      </Container>
    );
  }

  if (chartError) {
    return (
      <Container>
        <Alert title="Error!" color="red">
          Error loading chart data.
        </Alert>
      </Container>
    );
  }

  if (usersPropsLoading) {
    return (
      <Container>
        <Loader variant="dots" />
        <div>Loading properties...</div>
      </Container>
    );
  }

  const breakdownSelectValues = props.map((prop) => ({
    value: prop,
    label: prop.charAt(0).toUpperCase() + String(prop).slice(1),
  }));

  return (
    <Container>
      <Title order={3} mb="md">
        Active Users
      </Title>

      <Group>
        <Select
          label="Metric"
          data={[{ value: "users/active", label: "Total Active Users" }]}
          value="users/active"
          mb="lg"
        />

        <Select
          label="Breakdown by (1)"
          data={breakdownSelectValues}
          value={firstDimensionKey}
          onChange={(value) => value && setFirstDimensionKey(value)}
          mb="lg"
          searchable
        />

        <Select
          label="Breakdown by (2)"
          data={[
            ...breakdownSelectValues.map(({ value, label }) => ({
              value,
              label,
              disabled: value === firstDimensionKey,
            })),
            { value: "date", label: "Date" },
          ]}
          value={secondDimensionKey}
          onChange={(value) => value && setSecondDimensionKey(value)}
          mb="lg"
          searchable
        />
      </Group>

      {series.length > 0 ? (
        <BarChart
          h={300}
          data={data?.data || []}
          dataKey="value"
          type="stacked"
          series={series}
          withLegend
        />
      ) : (
        <Alert title="No Data" color="yellow">
          No series available to display the chart.
        </Alert>
      )}
    </Container>
  );
}
