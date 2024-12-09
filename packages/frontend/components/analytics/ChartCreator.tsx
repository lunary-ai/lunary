import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Select,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

import { BarChart } from "@mantine/charts";

import RenamableField from "@/components/blocks/RenamableField";
import CheckPicker from "@/components/checks/Picker";
import { useAnalyticsChartData } from "@/utils/dataHooks/analytics";
import { useCustomCharts } from "@/utils/dataHooks/dashboards";
import { useExternalUsersProps } from "@/utils/dataHooks/external-users";
import { LogicNode } from "shared";
import AreaChartComponent from "./Charts/AreaChartComponent";

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
  return sortedSeriesNames.map((name, index) => ({
    name,
    color: COLOR_PALETTE[index] || "gray.6",
  }));
}

export function CustomChartCreator({
  onConfirm,
  config = {},
  dashboardStartDate,
  dashboardEndDate,
}: {
  onConfirm: (chart: any) => void;
  config?: any;
}) {
  const [name, setName] = useState("");
  const [metric, setMetric] = useState("users/active");
  const [primaryDimension, setPrimaryDimension] = useState<string>();
  const [secondaryDimension, setSecondaryDimension] = useState<string>();
  const [checks, setChecks] = useState<LogicNode>(["AND"]);

  const { props, isLoading: usersPropsLoading } = useExternalUsersProps();

  const isCustomEventsMetric = metric === "custom-events";

  useEffect(() => {
    if (props && !primaryDimension) {
      setPrimaryDimension(props[0]);
      setSecondaryDimension("date");
    }
  }, [props, primaryDimension]);

  useEffect(() => {
    if (!isCustomEventsMetric) {
      setChecks(["AND"]);
    }
  }, [metric]);

  useEffect(() => {
    const chartTitle = isCustomEventsMetric
      ? "Custom events"
      : `Total Active Users by ${primaryDimension} and ${secondaryDimension}`;
    setName(chartTitle);
  }, [primaryDimension, secondaryDimension, isCustomEventsMetric]);

  const granularity = "daily";

  const appliedPrimaryDimension = isCustomEventsMetric
    ? undefined
    : primaryDimension;
  const appliedSecondaryDimension = isCustomEventsMetric
    ? undefined
    : secondaryDimension;

  const {
    data,
    isLoading: chartLoading,
    error: chartError,
  } = useAnalyticsChartData<any>(
    metric,
    dashboardStartDate,
    dashboardEndDate,
    granularity,
    checks,
    appliedPrimaryDimension,
    appliedSecondaryDimension,
  );

  const series = useMemo(() => {
    if (!data?.data || data.data.length === 0) return [];
    const seriesSet = new Set<string>();
    data.data.forEach((item: Record<string, any>) => {
      Object.keys(item).forEach((key) => {
        if (key !== "value") {
          seriesSet.add(key);
        }
      });
    });
    return generateSeries(Array.from(seriesSet));
  }, [data]);

  const breakdownSelectValues = (props || []).map((prop) => ({
    value: prop,
    label: prop.charAt(0).toUpperCase() + prop.slice(1),
  }));

  // Dummy data for AreaChart (for  events scenario)
  const dummyAreaData = [
    { date: "2024-01-01T00:00:00.000Z", value: 10, name: "dummy" },
    { date: "2024-01-02T00:00:00.000Z", value: 25, name: "dummy" },
    { date: "2024-01-03T00:00:00.000Z", value: 40, name: "dummy" },
    { date: "2024-01-04T00:00:00.000Z", value: 20, name: "dummy" },
    { date: "2024-01-05T00:00:00.000Z", value: 60, name: "dummy" },
  ];

  const { insert: insertCustomChart } = useCustomCharts();

  if (chartLoading || usersPropsLoading) {
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

  function handleSave() {
    const chartName =
      name ||
      (isCustomEventsMetric
        ? "Custom events"
        : `Total Active Users by ${primaryDimension} and ${secondaryDimension}`);

    insertCustomChart({
      name: chartName,
      description: JSON.stringify({
        series: isCustomEventsMetric ? ["dummy"] : series,
      }),
      type: isCustomEventsMetric ? "area" : "bar",
      dataKey: metric,
      primaryDimension: isCustomEventsMetric ? null : primaryDimension,
      secondaryDimension: isCustomEventsMetric ? null : secondaryDimension,
    }).then((inserted) => {
      onConfirm();
    });
  }

  return (
    <Container>
      <RenamableField value={name} onRename={setName} defaultValue={name} />

      <Group mb="lg" mt="md">
        <Select
          label="Metric"
          data={[
            { value: "users/active", label: "Total Active Users" },
            { value: "users/new", label: "Total New Users" },
            { value: "custom-events", label: "Custom events" },
          ]}
          value={metric}
          onChange={(value) => value && setMetric(value)}
          searchable
        />

        {isCustomEventsMetric ? (
          <Box style={{ alignSelf: "flex-end" }}>
            <CheckPicker
              minimal
              value={checks}
              onChange={setChecks}
              restrictTo={(filter) => ["custom-events"].includes(filter.id)}
            />
          </Box>
        ) : (
          <>
            <Select
              label="First breakdown"
              data={breakdownSelectValues}
              value={primaryDimension}
              onChange={(value) => value && setPrimaryDimension(value)}
              searchable
            />

            <Select
              label="Second breakdown"
              data={[
                ...breakdownSelectValues.map(({ value, label }) => ({
                  value,
                  label,
                  disabled: value === primaryDimension,
                })),
                { value: "date", label: "Date" },
              ]}
              value={secondaryDimension}
              onChange={(value) => value && setSecondaryDimension(value)}
              searchable
            />
          </>
        )}
      </Group>

      {isCustomEventsMetric ? (
        <AreaChartComponent
          data={data?.data || []}
          granularity="daily"
          color={null}
          aggregationMethod={null}
          stat={null}
        />
      ) : series.length > 0 ? (
        <BarChart
          h={300}
          withYAxis={false}
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

      <Group gap="sm" justify="right" mt="xl">
        <Button onClick={handleSave}>Save</Button>
      </Group>
    </Container>
  );
}
