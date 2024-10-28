import { useState, useMemo, useEffect } from "react";
import {
  Flex,
  Select,
  Group,
  Box,
  ActionIcon,
  Button,
  Loader,
  NumberInput,
  TextInput,
  Checkbox,
  SegmentedControl,
  Grid,
  Stack,
  Stepper,
  SimpleGrid,
  Text,
} from "@mantine/core";

import {
  BarChart as MantineBarChart,
  LineChart as MantineLineChart,
  PieChart as MantinePieChart,
  RadarChart as MantineRadarChart,
  ScatterChart as MantineScatterChart,
  AreaChart as MantineAreaChart,
  DonutChart as MantineDonutChart,
  BubbleChart as MantineBubbleChart,
} from "@mantine/charts";

import { useSessionStorage, useInViewport } from "@mantine/hooks";
import { IconCancel, IconTrash, IconPlus } from "@tabler/icons-react";

import {
  CHART_DATA,
  CHART_SERIES,
  BASE_CHART_PROPS,
  deserializeDateRange,
  getDefaultDateRange,
} from "@/utils/analytics";
import { useProjectSWR } from "@/utils/dataHooks";
import { useChart } from "@/utils/dataHooks/charts";
import {
  useAnalyticsChartData,
  useTopModels,
  useTopTemplates,
} from "@/utils/dataHooks/analytics";
import { useExternalUsers } from "@/utils/dataHooks/external-users";

import LineChart from "@/components/analytics/LineChart";

import ErrorBoundary from "../blocks/ErrorBoundary";
import { Selectable } from "./Wrappers";

const CHARTS = [
  {
    name: "LunaryChart",
    props: {
      height: { type: "number", defaultValue: 230 },
      splitBy: { type: "string" },
      granularity: {
        type: "segmented",
        options: [
          { label: "Day", value: "daily" },
          { label: "Week", value: "weekly" },
          { label: "Hourly", value: "hourly" },
        ],
        defaultValue: "daily",
      },
      agg: {
        type: "segmented",
        options: [
          { label: "Sum", value: "sum" },
          { label: "Average", value: "agg" },
        ],
      },
      title: { type: "string" },
      description: { type: "string" },
    },
    component({ data, props, series }) {
      const [dateRange, _] = useSessionStorage({
        key: "dateRange-analytics",
        getInitialValueInEffect: false,
        deserialize: deserializeDateRange,
        defaultValue: getDefaultDateRange(),
      });

      const [startDate, endDate] = dateRange;
      return (
        <LineChart
          data={data.map((item) => {
            // TODO: Clean this up!!
            return {
              ...item,
              date: new Date(
                item.date || item.createdAt || new Date(),
              ).toISOString(),
            };
          })}
          startDate={startDate}
          endDate={endDate}
          props={series.map((serie) => serie.name)}
          colors={[
            ...series.map((serie) => serie.color).filter(Boolean),
            "blue",
            "pink",
            "indigo",
            "green",
            "violet",
            "yellow",
          ]}
          granularity={"daily"}
          {...props}
        />
      );
    },
  },
  {
    name: "BarChart",
    props: {
      ...BASE_CHART_PROPS,
      orientation: {
        type: "segmented",
        options: [
          {
            label: "Horizontal",
            value: "horizontal",
          },
          {
            label: "Vertical",
            value: "vertical",
          },
        ],
        defaultValue: "horizontal",
      },
    },
    component({ data, props, series }) {
      return <MantineBarChart h={300} series={series} data={data} {...props} />;
    },
  },
  {
    name: "LineChart",
    props: {
      curveType: {
        type: "array",
        defaultValue: "linear",
        options: [
          "linear",
          "bump",
          "natural",
          "monotone",
          "step",
          "stepBefore",
          "stepAfter",
        ],
      },
      ...BASE_CHART_PROPS,
      connectNulls: { type: "boolean" },
    },
    component({ props, data, series }) {
      return (
        <MantineLineChart h={300} data={data} series={series} {...props} />
      );
    },
  },
  {
    name: "AreaChart",
    props: { ...BASE_CHART_PROPS, connectNulls: { type: "boolean" } },
    component({ props, data, series }) {
      return (
        <MantineAreaChart h={300} data={data} series={series} {...props} />
      );
    },
  },
  {
    name: "RadarChart",
    props: { ...BASE_CHART_PROPS },
    component({ props, data, series }) {
      return (
        <MantineRadarChart h={300} data={data} series={series} {...props} />
      );
    },
  },
  {
    name: "PieChart",
    props: { ...BASE_CHART_PROPS },
    component({ props }) {
      const data: any = [];
      for (const serie of CHART_SERIES) {
        data.push({ ...serie, value: CHART_DATA[0][serie.name] });
      }
      return <MantinePieChart h={300} data={data} {...props} />;
    },
  },
  {
    name: "DonutChart",
    props: { ...BASE_CHART_PROPS },
    component({ props }) {
      const data: any = [];
      for (const serie of CHART_SERIES) {
        data.push({ ...serie, value: CHART_DATA[0][serie.name] });
      }
      return <MantineDonutChart h={300} data={data} {...props} />;
    },
  },
];

function useChartData(data, startDate, endDate) {
  if (!data.source || data.source === "runs") {
    const { data, isLoading } = useProjectSWR("/runs");
    return { data: data?.data, isLoading };
  } else if (data.source === "models") {
    const { data, isLoading } = useProjectSWR("/models");
    return { data: data, isLoading };
  } else if (data.source === "templates")
    return useTopTemplates(startDate, endDate);
  else if (data.source === "users") {
    const { users, loading } = useExternalUsers({ startDate, endDate });
    return { data: users, isLoading: loading };
  } else return useAnalyticsChartData(null, startDate, endDate, "");
}

function DynamicSelectFields({ first, value, onChange }) {
  const [color, setColor] = useState<string | undefined>(
    value?.color || "blue",
  );
  const [field, setField] = useState<string | null>(value?.field || null);
  const [subField, setSubField] = useState<string | null>(
    value?.subField || null,
  );
  const fieldOptions = useMemo(() => {
    switch (first) {
      case "runs":
        return [
          "projectId",
          "isPublic",
          "feedback",
          "parentFeedback",
          "type",
          "name",
          "createdAt",
          "endedAt",
          "duration",
          "cost",
          "tokens",
          "tags",
          "input",
          "output",
          "params",
          "metadata",
          "user",
        ];
      case "users":
        return ["id", "createdAt", "externalId", "lastSeen", "props", "cost"];
      case "templates":
        return [
          "name",
          "cost",
          "promptTokens",
          "completionTokens",
          "totalTokens",
        ];
      case "models":
        return [
          "id",
          "name",
          "pattern",
          "unit",
          "inputCost",
          "outputCost",
          "tokenizer",
          "startDate",
          "createdAt",
          "updatedAt",
          "orgId",
        ];
      default:
        return [];
    }
  }, [first]);

  const { data, isLoading } = useProjectSWR(() => {
    switch (field) {
      case "metadata":
        return "/filters/metadata";
      default:
        return null;
    }
  });

  const subFieldOptions = useMemo(() => {
    switch (field) {
      case "feedback":
        return [];
      case "metadata":
        return data;
      default:
        return null;
    }
  }, [field, data]);

  useEffect(() => {
    onChange({ field, subField, color });
  }, [field, subField, color]);

  return (
    <Flex gap="sm">
      {fieldOptions?.length && (
        <Select
          defaultValue={field}
          data={fieldOptions}
          onChange={(value) => setField(value)}
        />
      )}
      {subFieldOptions?.length && (
        <Select
          defaultValue={subField}
          data={subFieldOptions}
          onChange={(value) => setSubField(value)}
        />
      )}
      {fieldOptions?.length && (
        // <ColorPicker value={color} onChange={setColor} size="xs" />
        <ColorSelector color={color} setColor={setColor} />
      )}
    </Flex>
  );
}

function ColorSelector({ color, setColor }) {
  const colors = [
    { value: "blue", label: "Blue" },
    { value: "red", label: "Red" },
    { value: "orange", label: "Orange" },
    { value: "yellow", label: "Yellow" },
    { value: "green", label: "Green" },
    { value: "indigo", label: "Indigo" },
    { value: "violet", label: "Violet" },
    { value: "pink", label: "Pink" },
    { value: "gray", label: "Gray" },
  ];

  return (
    <Select data={colors} value={color} onChange={(value) => setColor(value)} />
  );
}

function DynamicSelect({ config, setConfig }) {
  const [first, setFirst] = useState(config.data.source || "runs");
  const firstOptions = ["runs", "users", "models", "templates"];

  const [seriesLength, setSeriesLength] = useState(
    config.data.series?.length || 1,
  );

  const onChange = (index, value) => {
    setConfig((config) => {
      const newConfig = { ...config };
      newConfig.data.series[index] = value;
      return newConfig;
    });
  };

  return (
    <Group>
      <Box>
        <h3>Data Source</h3>
        <Select
          defaultValue={first}
          data={firstOptions}
          onChange={(value) => {
            setFirst(value);
            setConfig((config) => ({
              ...config,
              data: {
                ...config.data,
                source: value,
              },
            }));
          }}
        />
      </Box>
      <Flex gap="sm" direction={"column"}>
        <h3>Display Fields</h3>
        {Array.from({ length: seriesLength }).map((_, index) => (
          <Flex key={index} align="center">
            <DynamicSelectFields
              first={first}
              onChange={(value: any) => onChange(index, value)}
              value={config.data.series ? config.data.series[index] : null}
            />
            <ActionIcon
              ml="sm"
              onClick={() => {
                if (seriesLength > 1) {
                  config.data.series.splice(index, 1);
                  setSeriesLength((len) => len - 1);
                } else {
                  onChange(index, {
                    field: undefined,
                    subField: undefined,
                    color: undefined,
                  });
                }
              }}
            >
              <IconCancel size={16} />
            </ActionIcon>
          </Flex>
        ))}
        <Button onClick={() => setSeriesLength((len: number) => len + 1)}>
          Add Field
        </Button>
      </Flex>
    </Group>
  );
}

function DynamicChartPreview({ chartConfig, setChartConfig }) {
  const selectedChart = useMemo(
    () => CHARTS.find((item) => item.name === chartConfig.name),
    [chartConfig],
  );

  if (!selectedChart)
    return (
      <Text>
        No chart found with name: <code>{chartConfig.name}</code>
      </Text>
    );

  const [dateRange, setDateRange] = useSessionStorage({
    key: "dateRange-analytics",
    getInitialValueInEffect: false,
    deserialize: deserializeDateRange,
    defaultValue: getDefaultDateRange(),
  });

  const [startDate, endDate] = dateRange;
  const { data, props } = chartConfig;

  const series = chartConfig.data.series
    .map((serie) => {
      if (!serie.field) return null;
      return {
        name: serie.field,
        color: serie.color,
      };
    })
    .filter(Boolean);

  const chartData = useChartData(data, startDate, endDate);

  if (chartData.isLoading) {
    return <Loader />;
  }

  function handlePropChange(propName, value) {
    setChartConfig((config) => ({
      ...config,
      props: {
        ...config.props,
        [propName]: value,
      },
    }));
  }

  function convertCase(camelStr) {
    return (camelStr.charAt(0).toUpperCase() + camelStr.slice(1)).split(
      /(?=[A-Z])/,
    );
  }

  function renderPropInput(prop, propName, value, handleValue) {
    switch (prop.type) {
      case "number":
        return (
          <NumberInput
            label={convertCase(propName)}
            required={prop.required}
            value={value || prop.defaultValue || 0}
            onChange={(value) => handleValue(propName, value)}
          />
        );
      case "string":
        return (
          <TextInput
            label={convertCase(propName)}
            required={prop.required}
            value={value || prop.defaultValue || ""}
            onChange={(event) => handleValue(propName, event.target.value)}
          />
        );
      case "boolean":
        return (
          <Checkbox
            label={convertCase(propName)}
            required={prop.required}
            checked={
              /* To avoid the value defaulting to undefined which would result in this being an 'uncontrolled' component  */
              typeof value !== "undefined"
                ? value
                : typeof prop.defaultValue !== "undefined"
                  ? prop.defaultValue
                  : false
            }
            onChange={(event) => handleValue(propName, event.target.checked)}
          />
        );
      case "array":
        return (
          <Box>
            <h6>{convertCase(propName)}</h6>
            <Select
              data={prop.options}
              defaultValue={prop.defaultValue}
              onChange={(value) => handleValue(propName, value)}
            />
          </Box>
        );
      case "segmented":
        return (
          <Box>
            <h6>{convertCase(propName)}</h6>
            <SegmentedControl
              data={prop.options}
              defaultValue={prop.defaultValue}
              onChange={(value) => handleValue(propName, value)}
            />
          </Box>
        );
      case "group":
        const subProps = value || {};
        return (
          <Box>
            <h4>{propName}</h4>
            {Object.keys(prop.children).map((subPropName) => {
              return (
                <Box key={subPropName} mb="sm">
                  {renderPropInput(
                    prop.children[subPropName],
                    subPropName,
                    subProps[subPropName],
                    (_, value) => {
                      subProps[subPropName] = value;
                      handleValue(propName, subProps);
                    },
                  )}
                </Box>
              );
            })}
          </Box>
        );
      default:
        return null;
    }
  }

  return (
    <Grid pt="sm">
      <Grid.Col span={{ sm: 12, md: 6 }}>
        <Box>
          <h3>{selectedChart.name} Preview</h3>
          <selectedChart.component
            props={props}
            series={series || []}
            data={(chartData.data || []).slice(0, chartConfig.limit)}
          />
        </Box>
      </Grid.Col>

      <Grid.Col
        span={{ sm: 12, md: 6 }}
        style={{
          overflowY: "scroll",
          height: "45rem",
        }}
      >
        <Group mb="sm" gap="md">
          <DynamicSelect config={chartConfig} setConfig={setChartConfig} />
        </Group>
        <Box>
          <h3>Chart Config</h3>
          <Box mb="sm">
            <h5>Data Limit</h5>
            <NumberInput
              defaultValue={chartConfig.limit || chartData.data?.length}
              onChange={(limit) =>
                setChartConfig((conf) => ({ ...conf, limit }))
              }
            />
          </Box>
          <Box mb="sm">
            <h5>Data Key</h5>
            <Select
              data={Object.keys((chartData.data || [{}])[0])}
              onChange={(value) => handlePropChange("dataKey", value)}
            />
          </Box>
          {Object.keys(selectedChart.props).map((propName) => {
            return (
              <Box key={propName} mb="sm">
                {renderPropInput(
                  selectedChart.props[propName],
                  propName,
                  chartConfig.props[propName],
                  handlePropChange,
                )}
              </Box>
            );
          })}
        </Box>
      </Grid.Col>
    </Grid>
  );
}

export function SelectableCustomChart({
  index,
  chart,
  chartsState,
  toggleChart,
}) {
  const { chart: item, remove } = useChart(chart.id, chart);
  const { name, data, props } = item?.config || {};

  const [dateRange, _] = useSessionStorage({
    key: "dateRange-analytics",
    getInitialValueInEffect: false,
    deserialize: deserializeDateRange,
    defaultValue: getDefaultDateRange(),
  });

  const [startDate, endDate] = dateRange;

  const chartData = useChartData(data, startDate, endDate);

  const series = data.series
    .map((serie) => {
      if (!serie.field) return null;
      return {
        name: serie.field,
        color: serie.color,
      };
    })
    .filter(Boolean);

  return (
    <Selectable
      key={index}
      header={item.id}
      icons={[
        {
          icon: IconTrash,
          color: "red",
          onClick: remove,
        },
      ]}
      isSelected={chartsState.extras?.includes(item.id)}
      onSelect={() => toggleChart(item.id, "extras")}
    >
      {CHARTS.find((c) => name === c.name)?.component({
        data: chartData.data || [],
        props,
        series: series || [],
      })}
    </Selectable>
  );
}

export function CustomChart({ chartID }) {
  const { ref, inViewport } = useInViewport();
  const [load, setLoad] = useState(inViewport);
  useEffect(() => {
    if (inViewport) {
      setLoad(true);
    }
  }, [inViewport]);

  if (!load) {
    // return null;
  }

  const { chart: item } = useChart(chartID);
  const chart = CHARTS.find((c) => item.config.name === c.name);

  if (!chart) return null;

  const { name, data, props } = item?.config || {};
  const [dateRange, setDateRange] = useSessionStorage({
    key: "dateRange-analytics",
    getInitialValueInEffect: false,
    deserialize: deserializeDateRange,
    defaultValue: getDefaultDateRange(),
  });

  const [startDate, endDate] = dateRange;

  const chartData = useChartData(data, startDate, endDate);

  if (chartData.isLoading) return null;

  const series = data.series
    .map((serie) => {
      if (!serie.field) return null;
      return {
        name: serie.field,
        color: serie.color,
      };
    })
    .filter(Boolean);

  return (
    <Box ref={ref}>
      <ErrorBoundary>
        {chart.component({ data: chartData.data, props, series })}
      </ErrorBoundary>
    </Box>
  );
}

export function CustomChartCreator({ onConfirm }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [chartConfig, setChartConfig] = useState({
    name: CHARTS[0].name,
    props: {},
    data: { source: null, series: [] },
  });
  const [active, setActive] = useState(0);

  const nextStep = () =>
    setActive((current) => (current < 3 ? current + 1 : current));
  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current));

  return (
    <Stack>
      <Text>Custom Chart</Text>

      <Stepper active={active} onStepClick={setActive}>
        <Stepper.Step label="First step" description="Chart Type">
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
            {CHARTS.map((chart) => {
              return (
                <Selectable
                  header={chart.name}
                  icon={() => (
                    <ActionIcon
                      onClick={() => {
                        setChartConfig((config) => ({
                          ...config,
                          name: chart.name,
                        }));
                        nextStep();
                      }}
                    >
                      <IconPlus size="12" />
                    </ActionIcon>
                  )}
                >
                  {chart.component({
                    data: CHART_DATA,
                    series: CHART_SERIES,
                    props: { dataKey: "date" },
                  })}
                </Selectable>
              );
            })}
          </SimpleGrid>
        </Stepper.Step>
        <Stepper.Step label="Second step" description="Chart Configuration">
          <TextInput
            value={name}
            onChange={(ev) => setName(ev.currentTarget.value)}
            placeholder="Chart Name"
            required
          />
          <DynamicChartPreview
            chartConfig={chartConfig}
            setChartConfig={setChartConfig}
          />
        </Stepper.Step>
        <Stepper.Completed>
          {saving ? <Loader size={20} /> : <Text>Chart Saved</Text>}
        </Stepper.Completed>
      </Stepper>

      <Group justify="center" mt="xl">
        <Button variant="default" disabled={active === 0} onClick={prevStep}>
          Back
        </Button>
        {active === 1 ? (
          <Button
            onClick={() => {
              nextStep();
              setSaving(true);
              onConfirm({ name, config: chartConfig }).then(() =>
                setSaving(false),
              );
            }}
          >
            Finish
          </Button>
        ) : (
          <Button onClick={nextStep}>Next step</Button>
        )}
      </Group>
    </Stack>
  );
}
