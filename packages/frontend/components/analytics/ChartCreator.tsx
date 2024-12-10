import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Input,
  Loader,
  Select,
  Stack,
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
import DateRangeGranularityPicker, {
  useDateRangeGranularity,
} from "./DateRangeGranularityPicker";

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
  dashboardGranularity,
  setActiveTab,
}: {
  onConfirm: () => void;
  config?: any;
  dashboardStartDate?: Date;
  dashboardEndDate?: Date;
  dashboardGranularity?: string;
}) {
  const [name, setName] = useState(config?.name || "");
  const [metric, setMetric] = useState(config?.dataKey || "users/active");
  const [primaryDimension, setPrimaryDimension] = useState<string | undefined>(
    config?.primaryDimension || undefined,
  );
  const [secondaryDimension, setSecondaryDimension] = useState<
    string | undefined
  >(config?.secondaryDimension || undefined);
  const [checks, setChecks] = useState<LogicNode>(config?.checks || ["AND"]);

  const { props, isLoading: usersPropsLoading } = useExternalUsersProps();

  const isCustomEventsMetric = metric === "custom-events";

  useEffect(() => {
    if (props && !primaryDimension && !isCustomEventsMetric) {
      setPrimaryDimension(props[0]);
      setSecondaryDimension("date");
    }
  }, [props, primaryDimension, isCustomEventsMetric]);

  useEffect(() => {
    if (!isCustomEventsMetric) {
      setChecks(["AND"]);
    }
  }, [metric]);

  useEffect(() => {
    if (!config?.id) {
      const chartTitle = isCustomEventsMetric
        ? "Custom events"
        : `Total Active Users by ${primaryDimension} and ${secondaryDimension}`;
      setName(chartTitle);
    }
  }, [primaryDimension, secondaryDimension, isCustomEventsMetric, config?.id]);

  const { startDate, endDate, setDateRange, granularity, setGranularity } =
    useDateRangeGranularity();

  useEffect(() => {
    if (config?.startDate && config?.endDate && config?.granularity) {
      setDateRange([new Date(config.startDate), new Date(config.endDate)]);
      setGranularity(config.granularity);
    } else {
      setDateRange([dashboardStartDate, dashboardEndDate]);
      setGranularity(dashboardGranularity);
    }
  }, [dashboardStartDate, dashboardEndDate, dashboardGranularity, config]);

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
    startDate,
    endDate,
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

  const { insert: insertCustomChart, update: updateCustomChart } =
    useCustomCharts();

  if (chartError) {
    return (
      <Container>
        <Alert title="Error!" color="red">
          Error loading chart data.
        </Alert>
      </Container>
    );
  }

  const isEditing = !!config?.id;

  async function handleSave() {
    const chartName =
      name ||
      (isCustomEventsMetric
        ? "Custom events"
        : `Total Active Users by ${primaryDimension} and ${secondaryDimension}`);

    const chartPayload = {
      name: chartName,
      type: isCustomEventsMetric
        ? "area"
        : secondaryDimension === "date"
          ? "area"
          : "bar",
      dataKey: metric,
      primaryDimension: isCustomEventsMetric ? null : primaryDimension,
      secondaryDimension: isCustomEventsMetric ? null : secondaryDimension,
      checks,
      startDate,
      endDate,
      granularity,
    };

    if (isEditing) {
      await updateCustomChart(config.id, chartPayload);
    } else {
      await insertCustomChart(chartPayload);
    }

    setActiveTab("custom");
    onConfirm();
  }

  return (
    <Stack p="xl">
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

        <Input.Wrapper label="Date">
          <DateRangeGranularityPicker
            dateRange={[startDate, endDate]}
            setDateRange={setDateRange}
            granularity={granularity}
            setGranularity={setGranularity}
          />
        </Input.Wrapper>
      </Group>
      {isCustomEventsMetric ? (
        <AreaChartComponent
          data={data?.data || []}
          granularity="daily"
          color={null}
          aggregationMethod={null}
          stat={null}
        />
      ) : appliedSecondaryDimension === "date" && series.length > 0 ? (
        <AreaChartComponent
          data={data?.data || []}
          granularity={granularity}
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
      ) : !chartLoading ? (
        <Alert title="No Data" color="yellow">
          No series available to display the chart.
        </Alert>
      ) : (
        <Loader h="400px" w="100%" />
      )}
      <Group gap="sm" justify="right" mt="xl">
        <Button onClick={handleSave}>{isEditing ? "Update" : "Save"}</Button>
      </Group>
    </Stack>
  );
}
