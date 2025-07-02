import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Input,
  Loader,
  Select,
  SegmentedControl,
  Stack,
  TextInput,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

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
import BarChartComponent from "./Charts/BarChartComponent";
import { BarChart } from "@mantine/charts";

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
  setActiveTab?: (tab: string) => void;
}) {
  const [name, setName] = useState(config?.name || "");
  const [description, setDescription] = useState(config?.description || "");
  const [metric, setMetric] = useState(config?.dataKey || "users/active");
  const [primaryDimension, setPrimaryDimension] = useState<string | undefined>(
    config?.primaryDimension || undefined,
  );
  const [secondaryDimension, setSecondaryDimension] = useState<
    string | undefined
  >(config?.secondaryDimension || undefined);
  const [checks, setChecks] = useState<LogicNode>(config?.checks || ["AND"]);
  const [chartType, setChartType] = useState<"bar" | "area">(
    config?.type || "area",
  );

  const { props } = useExternalUsersProps();

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

  // Automatically set chart type based on conditions, but only if not manually changed
  useEffect(() => {
    if (!config?.type) {
      const automaticType = isCustomEventsMetric
        ? "area"
        : secondaryDimension === "date"
          ? "area"
          : "bar";
      setChartType(automaticType);
    }
  }, [isCustomEventsMetric, secondaryDimension, config?.type]);

  const { startDate, endDate, setDateRange, granularity, setGranularity } =
    useDateRangeGranularity();

  useEffect(() => {
    if (config?.startDate && config?.endDate && config?.granularity) {
      setDateRange([new Date(config.startDate), new Date(config.endDate)]);
      setGranularity(config.granularity);
    } else {
      if (dashboardStartDate && dashboardEndDate) {
        setDateRange([dashboardStartDate, dashboardEndDate]);
      }
      if (dashboardGranularity) {
        setGranularity(dashboardGranularity as any);
      }
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

  const chartData = useMemo(() => {
    if (!data) return [];
    // Handle both data formats: direct array or nested data.data
    return Array.isArray(data) ? data : (data as any).data || [];
  }, [data]);

  const series = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    const seriesSet = new Set<string>();
    chartData.forEach((item: Record<string, any>) => {
      Object.keys(item).forEach((key) => {
        if (key !== "value" && key !== "date") {
          seriesSet.add(key);
        }
      });
    });
    return generateSeries(Array.from(seriesSet));
  }, [chartData]);

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
      description, // Pass custom description here
      type: chartType,
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
      await insertCustomChart(chartPayload as any);
    }

    if (setActiveTab) {
      setActiveTab("custom");
    }
    onConfirm();
  }

  return (
    <Stack p="xl">
      <RenamableField value={name} onRename={setName} defaultValue={name} />
      <TextInput
        w="500px"
        label="Description (optional)"
        placeholder="Enter a custom description"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
      />
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
          <></>
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
            disableWeekly
          />
        </Input.Wrapper>
      </Group>

      {secondaryDimension === "date" && !isCustomEventsMetric && (
        <Input.Wrapper label="Chart Type">
          <br />
          <SegmentedControl
            value={chartType}
            size="xs"
            onChange={(value) => setChartType(value as "bar" | "area")}
            data={[
              { label: "Bar", value: "bar" },
              { label: "Area", value: "area" },
            ]}
          />
        </Input.Wrapper>
      )}

      {isCustomEventsMetric && (
        <Box>
          <CheckPicker
            minimal
            value={checks}
            onChange={setChecks}
            restrictTo={(filter) => ["custom-events"].includes(filter.id)}
          />
        </Box>
      )}

      {appliedSecondaryDimension === "date" &&
        chartData.length &&
        chartType === "area" && (
          <AreaChartComponent
            data={chartData}
            granularity={isCustomEventsMetric ? "daily" : granularity}
            color={null}
            aggregationMethod={null}
            stat={null}
          />
        )}

      {appliedSecondaryDimension === "date" &&
        chartData.length &&
        chartType === "bar" && (
          <BarChartComponent
            data={chartData}
            granularity={isCustomEventsMetric ? "daily" : granularity}
            color={null}
            aggregationMethod={null}
            stat={null}
          />
        )}

      {chartData.length > 0 && appliedSecondaryDimension !== "date" && (
        <BarChart
          h={300}
          withYAxis={false}
          data={data?.data || []}
          dataKey="value"
          type="stacked"
          series={series}
          withLegend
        />
      )}

      {chartLoading && <Loader h="400px" w="100%" />}

      {!chartLoading && chartData.length === 0 && (
        <Alert title="No Data" color="yellow">
          No data available for this period.
        </Alert>
      )}

      <Group gap="sm" justify="right" mt="xl">
        <Button onClick={handleSave}>{isEditing ? "Update" : "Save"}</Button>
      </Group>
    </Stack>
  );
}
