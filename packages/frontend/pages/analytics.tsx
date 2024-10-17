import LineChart from "@/components/analytics/LineChart";
import TopModels from "@/components/analytics/TopModels";
import TopTemplates from "@/components/analytics/TopTemplates";
import TopUsersCard from "@/components/analytics/TopUsers";
import CheckPicker from "@/components/checks/Picker";
import Empty from "@/components/layout/Empty";
import DynamicChart from "@/components/analytics/Charts/DynamicChart";
import { useProject, useProjectSWR, useTemplates } from "@/utils/dataHooks";
import {
  useAnalyticsChartData,
  useTopModels,
  useTopTemplates,
} from "@/utils/dataHooks/analytics";
import { useExternalUsers } from "@/utils/dataHooks/external-users";
import { formatCost } from "@/utils/format";

import {
  ActionIcon,
  Box,
  Button,
  Card,
  CloseButton,
  ColorPicker,
  Flex,
  Group,
  Input,
  JsonInput,
  Loader,
  Menu,
  Modal,
  rem,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Tabs,
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
import { DatePickerInput } from "@mantine/dates";

import {
  useInViewport,
  useLocalStorage,
  useSessionStorage,
} from "@mantine/hooks";
import {
  IconCalendar,
  IconCancel,
  IconChartAreaLine,
  IconChartLine,
  IconCheck,
  IconCopyCheckFilled,
  IconEdit,
  IconFilter,
  IconMinus,
  IconPlus,
  IconRestore,
  IconTrash,
  IconUserEdit,
} from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { deserializeLogic, serializeLogic } from "shared";

import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { useDisclosure } from "@mantine/hooks";
import { useDashboard, useDashboards } from "@/utils/dataHooks/dashboards";
import { useRouter } from "next/router";
import TopTopics from "@/components/analytics/Charts/TopTopics";
import Sentiment from "@/components/analytics/Charts/Sentiment";

import { Grid, TextInput, NumberInput, Checkbox } from "@mantine/core";
import { useChart, useCharts } from "@/utils/dataHooks/charts";
import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import ImageMultiSelect from "@/components/blocks/ImageSelectField";

// Example chart components (replace these with your actual chart components)
const DemoLineChart = ({ stroke, strokeWidth, interpolation, dot, grid }) => (
  <div>LineChart preview</div>
);
const PieChart = ({
  radius,
  innerRadius,
  paddingAngle,
  startAngle,
  endAngle,
}) => <div>PieChart preview</div>;
const AreaChart = ({ baseLine, curveType, fillOpacity, margin, stack }) => (
  <div>AreaChart preview</div>
);
const RadarChart = ({
  startAngle,
  endAngle,
  angleField,
  radiusField,
  grid,
}) => <div>RadarChart preview</div>;

const BASE_CHART_PROPS = {
  dataKey: {
    type: "string",
    required: true,
  },
  gridAxis: {
    type: "segmented",
    options: [
      {
        label: "x",
        value: "x",
      },
      {
        label: "y",
        value: "y",
      },
      {
        label: "xy",
        value: "xy",
      },
      {
        label: "none",
        value: "none",
      },
    ],
  },
  // tickLine: {
  //   type: "segmented",
  //   options: [
  //     {
  //       label: "x",
  //       value: "x",
  //     },
  //     {
  //       label: "y",
  //       value: "y",
  //     },
  //     {
  //       label: "xy",
  //       value: "xy",
  //     },
  //     {
  //       label: "none",
  //       value: "none",
  //     },
  //   ],
  // },
  withXAxis: {
    type: "boolean",
    defaultValue: true,
  },
  withYAxis: {
    type: "boolean",
    defaultValue: true,
  },
  withDots: {
    type: "boolean",
    defaultValue: true,
  },
  withLegend: {
    type: "boolean",
  },
  withTooltip: {
    type: "boolean",
    defaultValue: true,
  },
  // xAxisProps: {
  //   type: "group",
  //   children: {
  //     xAxisId: {
  //       type: "string",
  //     },
  //     width: {
  //       type: "number",
  //     },
  //     height: {
  //       type: "number",
  //     },
  //     mirror: {
  //       type: "boolean",
  //     },
  //     orientation: {
  //       type: "segmented",
  //       options: [
  //         {
  //           label: "Top",
  //           value: "top",
  //         },
  //         {
  //           label: "Bottom",
  //           value: "bottom",
  //         },
  //       ],
  //     },
  //     padding: {
  //       type: "array",
  //       options: ["gap", "no-gap"],
  //     },
  //     minTickGap: {
  //       type: "number",
  //     },
  //     reversed: {
  //       type: "boolean",
  //     },
  //     angle: {
  //       type: "number",
  //     },
  //     tickMargin: {
  //       type: "number",
  //     },
  //   },
  // },
};

const CHART_DATA = [
  {
    date: "Mar 22",
    Apples: 2890,
    Oranges: 2338,
    Tomatoes: 2452,
  },
  {
    date: "Mar 23",
    Apples: 2756,
    Oranges: 2103,
    Tomatoes: 2402,
  },
  {
    date: "Mar 24",
    Apples: 3322,
    Oranges: 986,
    Tomatoes: 1821,
  },
  {
    date: "Mar 25",
    Apples: 3470,
    Oranges: 2108,
    Tomatoes: 2809,
  },
  {
    date: "Mar 26",
    Apples: 3129,
    Oranges: 1726,
    Tomatoes: 2290,
  },
];

const CHART_SERIES = [
  { name: "Apples", color: "indigo.6" },
  { name: "Oranges", color: "blue.6" },
  { name: "Tomatoes", color: "teal.6" },
];

const CHARTS = [
  {
    name: "BarChart",
    props: { ...BASE_CHART_PROPS },
    component({ data, props, series }) {
      return (
        <MantineBarChart
          h={300}
          series={series}
          data={data}
          {...props}
        />
      );
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
        <MantineLineChart
          h={300}
          data={data}
          series={series}
          {...props}
        />
      );
    },
  },
  {
    name: "AreaChart",
    props: { ...BASE_CHART_PROPS, connectNulls: { type: "boolean" } },
    component({ props, data, series }) {
      return (
        <MantineAreaChart
          h={300}
          data={data}
          series={series}
          {...props}
        />
      );
    },
  },
  {
    name: "RadarChart",
    props: { ...BASE_CHART_PROPS },
    component({ props, data, series }) {
      return (
        <MantineRadarChart
          h={300}
          data={data}
          series={series}
          {...props}
        />
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

const ALL_CHARTS = {
  main: ["models", "templates", "users"],
  extras: [
    "tokens",
    "costs",
    "errors",
    "users/new",
    "users/active",
    "users/average-cost",
    "run-types",
    "latency",
    "feedback-ratio",
    "top-topics",
    "sentiments",
  ],
};

const DEFAULT_CHARTS = {
  main: ["models", "templates", "users"],
  extras: [
    "tokens",
    "costs",
    "errors",
    "users/new",
    "users/active",
    "users/average-cost",
    "run-types",
    "latency",
    "feedback-ratio",
  ],
};

const DND_TYPES = {
  MAIN: "main",
  EXTRAS: "extras",
};

export function getDefaultDateRange() {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const oneWeekAgoDate = new Date(endOfToday);
  oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 30);
  oneWeekAgoDate.setHours(0, 0, 0, 0);
  const defaultRange: [Date, Date] = [oneWeekAgoDate, endOfToday];
  return defaultRange;
}

/**
 * This deserialize function handles the old localStorage format and
 * corrupted data (e.g., if the data was manually changed by the user).
 */
export function deserializeDateRange(value: any): [Date, Date] {
  const defaultRange: [Date, Date] = getDefaultDateRange();

  if (!value) {
    return defaultRange;
  }
  try {
    const range = JSON.parse(value);

    if (!Array.isArray(range) || range.length !== 2) {
      return defaultRange;
    }
    if (isNaN(Date.parse(range[0])) || isNaN(Date.parse(range[1]))) {
      return defaultRange;
    }

    const [startDate, endDate] = [new Date(range[0]), new Date(range[1])];

    return [startDate, endDate];
  } catch {
    return defaultRange;
  }
}

type PresetDateRange = "Today" | "7 Days" | "30 Days" | "3 Months" | "Custom";
type DateRange = [Date, Date];

// TODO tests
export function getDateRangeFromPreset(preset: PresetDateRange) {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startDate = new Date(endOfDay);
  startDate.setHours(0, 0, 0, 0);

  if (preset === "7 Days") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (preset === "30 Days") {
    startDate.setDate(startDate.getDate() - 30);
  } else if (preset === "3 Months") {
    startDate.setMonth(startDate.getMonth() - 3);
  }

  return [startDate, endOfDay];
}

// TODO: unit tests
function getPresetFromDateRange(dateRange: DateRange): PresetDateRange {
  const [startDate, endDate] = [new Date(dateRange[0]), new Date(dateRange[1])];
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);
  if (
    startDate.getTime() === startOfToday.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "Today";
  }

  const sevenDaysAgo = new Date(endOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  if (
    startDate.getTime() === sevenDaysAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "7 Days";
  }

  const thirtyDaysAgo = new Date(endOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  if (
    startDate.getTime() === thirtyDaysAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "30 Days";
  }

  const threeMonthsAgo = new Date(endOfToday);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  threeMonthsAgo.setHours(0, 0, 0, 0);
  if (
    startDate.getTime() === threeMonthsAgo.getTime() &&
    endDate.getTime() === endOfToday.getTime()
  ) {
    return "3 Months";
  }

  return "Custom";
}

export function DateRangeSelect({ dateRange, setDateRange }) {
  const selectedOption = getPresetFromDateRange(dateRange);
  const data = ["Today", "7 Days", "30 Days", "3 Months"];
  const displayData = selectedOption === "Custom" ? [...data, "Custom"] : data;

  function handleSelectChange(value) {
    const newDateRange = getDateRangeFromPreset(value);
    setDateRange(newDateRange);
  }

  return (
    <Select
      placeholder="Select date range"
      w="100"
      size="xs"
      allowDeselect={false}
      styles={{
        input: {
          height: 32,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderRight: 0,
        },
      }}
      data={displayData}
      value={selectedOption}
      onChange={handleSelectChange}
    />
  );
}

interface DateRangePickerProps {
  dateRange: [Date, Date];
  setDateRange: (dates: [Date, Date]) => void;
}

function DateRangePicker({ dateRange, setDateRange }: DateRangePickerProps) {
  const [localDateRange, setLocalDateRange] = useState<
    [Date | null, Date | null]
  >([dateRange[0], dateRange[1]]);

  useEffect(() => {
    setLocalDateRange([dateRange[0], dateRange[1]]);
  }, [dateRange]);

  function handleDateChange(dates: [Date | null, Date | null]) {
    setLocalDateRange(dates);
    if (dates[0] && dates[1]) {
      const [startDate, endDate] = dates;
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 99);

      setDateRange([dates[0], dates[1]]);
    }
  }
  return (
    <DatePickerInput
      type="range"
      placeholder="Pick date range"
      leftSection={<IconCalendar size={18} stroke={1.5} />}
      size="xs"
      w="fit-content"
      styles={{
        input: {
          borderTopLeftRadius: 0,
          height: 32,
          borderBottomLeftRadius: 0,
        },
      }}
      value={localDateRange}
      onChange={handleDateChange}
      maxDate={new Date()}
    />
  );
}

type Granularity = "hourly" | "daily" | "weekly";

interface GranularitySelectProps {
  dateRange: [Date, Date];
  granularity: Granularity;
  setGranularity: (granularity: Granularity) => void;
}

const determineGranularity = (
  dateRange: [Date, Date],
): "hourly" | "daily" | "weekly" => {
  const [startDate, endDate] = dateRange;
  const diffDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return "hourly";
  if (diffDays <= 60) return "daily";
  return "weekly";
};

function GranularitySelect({
  dateRange,
  granularity,
  setGranularity,
}: GranularitySelectProps) {
  const [options, setOptions] = useState<
    { value: Granularity; label: string }[]
  >([
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
  ]);

  useEffect(() => {
    const newGranularity = determineGranularity(dateRange);
    setGranularity(newGranularity);

    if (newGranularity === "hourly") {
      setOptions([{ value: "hourly", label: "Hourly" }]);
    } else if (newGranularity === "daily") {
      setOptions([{ value: "daily", label: "Daily" }]);
    } else {
      setOptions([
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
      ]);
    }
  }, [dateRange, setGranularity]);

  return (
    <Select
      placeholder="Granularity"
      w="100"
      size="xs"
      allowDeselect={false}
      ml="md"
      styles={{
        input: {
          height: 32,
        },
      }}
      data={options}
      value={granularity}
      onChange={(value) => setGranularity(value as Granularity)}
    />
  );
}

const DEFAULT_CHECK = ["AND"];

function AnalyticsChart({
  dataKey,
  splitBy,
  props,
  agg,
  title,
  description,
  startDate,
  endDate,
  granularity,
  serializedChecks,
  formatter,
  colors,
}: {
  dataKey: string;
  splitBy?: string;
  props: string[];
  agg?: "sum" | "avg";
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  granularity: Granularity;
  serializedChecks: string;
  formatter?: (value: number) => string;
  colors?: string[];
}) {
  const { ref, inViewport } = useInViewport();
  const [load, setLoad] = useState(inViewport);

  const { data, isLoading } = useAnalyticsChartData(
    load ? dataKey : undefined,
    startDate,
    endDate,
    granularity,
    serializedChecks,
  );

  useEffect(() => {
    if (inViewport) {
      setLoad(true);
    }
  }, [inViewport]);

  return (
    <Box ref={ref}>
      <LineChart
        data={data?.data}
        stat={data?.stat}
        loading={isLoading}
        splitBy={splitBy}
        props={props}
        agg={agg || "sum"}
        title={title}
        description={description}
        startDate={startDate}
        endDate={endDate}
        granularity={granularity}
        formatter={formatter}
        colors={colors}
      />
    </Box>
  );
}

function Draggable({ id, type, children, editMode }) {
  const [{ isDragging }, element] = useDrag(
    () => ({
      type,
      item: { id },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
      canDrag: () => editMode,
    }),
    [editMode],
  );

  return (
    <Box
      ref={element}
      h="100%"
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: editMode ? "move" : "auto",
      }}
    >
      {children}
    </Box>
  );
}

function Droppable({ type, children, editMode, onDrop }) {
  const [{ isOver }, element] = useDrop(
    () => ({
      accept: type,
      drop: onDrop,
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
      canDrop: () => editMode,
    }),
    [editMode],
  );

  return (
    <Box ref={element} h="100%">
      {children}
    </Box>
  );
}

function Selectable({
  header,
  isSelected,
  icons,
  children,
  onSelect,
}: {
  header?: string;
  isSelected?: boolean;
  children: any;
  icons?: any[];
  onSelect: () => any;
}) {
  const [selected, setSelected] = useState(!!isSelected);

  const onSelected = () => {
    setSelected(!selected);
    onSelect?.();
  };

  return (
    <Card withBorder>
      <Card.Section p="xs">
        <Group justify="space-between">
          <Text fw={500}>{header}</Text>

          <ActionIcon onClick={onSelected} color={selected ? "red" : undefined}>
            {selected ? <IconMinus size="12" /> : <IconPlus size="12" />}
          </ActionIcon>

          {icons &&
            icons.map((icon) => (
              <ActionIcon
                variant="subtle"
                color={icon.color}
                onClick={icon.onClick}
              >
                <icon.icon size="12" />
              </ActionIcon>
            ))}
        </Group>
      </Card.Section>

      <Card.Section>{children}</Card.Section>
    </Card>
  );
}

function SaveAsModal({ opened, close, title, onConfirm }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const confirm = async () => {
    try {
      await onConfirm(name);
      close();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Modal
      centered
      opened={opened}
      onClose={confirm}
      radius={"md"}
      title={title}
    >
      <Input.Wrapper error={error}>
        <Input
          mt="md"
          value={name}
          placeholder="Clearable input"
          onChange={(event) => setName(event.currentTarget.value)}
          rightSectionPointerEvents="all"
          rightSection={
            <CloseButton
              aria-label="Clear input"
              onClick={() => setName("")}
              style={{ display: name ? undefined : "none" }}
            />
          }
        />
      </Input.Wrapper>
      <Group align="right" mt="md">
        <Button variant="subtle" onClick={close}>
          Cancel
        </Button>
        <Button variant="filled" onClick={confirm}>
          Save
        </Button>
      </Group>
    </Modal>
  );
}

function SelectableCustomChart({ index, chart, chartsState, toggleChart }) {
  const { chart: item, remove } = useChart(chart.id, chart);
  const { name, data, props } = (item?.config || {});

  const [dateRange, setDateRange] = useSessionStorage({
    key: "dateRange-analytics",
    getInitialValueInEffect: false,
    deserialize: deserializeDateRange,
    defaultValue: getDefaultDateRange(),
  });

  const [startDate, endDate] = dateRange;

  const chartData = (() => {
    if (!data.source || data.source === "runs") {
      return useTopModels({ startDate, endDate });
    } else if (data.source === "templates") {
      return useTopTemplates(startDate, endDate);
    } else if (data.source === "users") {
      // TODO: FIX!!
      return useExternalUsers({ startDate, endDate });
    } else {
      return useProjectSWR(() => null)
    }
  })();

  const series = data.series.map(serie => {
    if (!serie.field) return null;
    return {
      name: serie.field,
      color: serie.color
    }
  }).filter(Boolean);

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
      isSelected={chartsState.extras.includes(item.id)}
      onSelect={() => toggleChart(item.id, "extras")}
    >
      {CHARTS.find((c) => name === c.name)?.component({
        data: ("data" in chartData
          ? chartData.data
          : chartData.users
          || []), props, series
      })}
    </Selectable>
  );
}

function CustomChart({ chartID }) {
  const { ref, inViewport } = useInViewport();
  const [load, setLoad] = useState(inViewport);
  useEffect(() => {
    if (inViewport) {
      setLoad(true);
    }
  }, [inViewport]);

  if (!load) {
    return null;
  }

  const { chart: item } = useChart(chartID);
  const chart = CHARTS.find((c) => item.config.name === c.name);

  if (!chart) return null;

  const { name, data, props } = (item?.config || {});
  const [dateRange, setDateRange] = useSessionStorage({
    key: "dateRange-analytics",
    getInitialValueInEffect: false,
    deserialize: deserializeDateRange,
    defaultValue: getDefaultDateRange(),
  });

  const [startDate, endDate] = dateRange;

  const chartData = (() => {
    if (!data.source || data.source === "runs") {
      return useTopModels({ startDate, endDate });
    } else if (data.source === "templates") {
      return useTopTemplates(startDate, endDate);
    } else if (data.source === "users") {
      // TODO: FIX!!
      return useExternalUsers({ startDate, endDate });
    } else {
      return useProjectSWR(() => null)
    }
  })();

  const series = data.series.map(serie => {
    if (!serie.field) return null;
    return {
      name: serie.field,
      color: serie.color
    }
  }).filter(Boolean);

  return (
    <Box ref={ref}>
      <ErrorBoundary>{chart.component({ data: chartData, props, series })}</ErrorBoundary>
    </Box>
  );
}

function ChartSelector({
  opened,
  close,
  chartsState,
  toggleChart,
  getChartComponent,
}) {
  const [activeTab, setActiveTab] = useState("charts");
  const { insert: insertChart, charts } = useCharts();

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        centered
        size="80vw"
        radius={"md"}
        transitionProps={{ transition: "fade", duration: 200 }}
        styles={{
          body: {
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Tabs
          variant="outline"
          value={activeTab}
          styles={{
            root: { minHeight: "75vh" },
          }}
        >
          <Tabs.List>
            <Tabs.Tab
              value="charts"
              leftSection={<IconChartLine />}
              onClick={() => setActiveTab("charts")}
            >
              All Charts
            </Tabs.Tab>
            <Tabs.Tab
              value="wizard"
              leftSection={<IconPlus />}
              onClick={() => setActiveTab("wizard")}
            >
              Chart Wizard
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="charts" p="md">
            <Stack mah={"75vh"} style={{ overflowY: "auto" }}>
              <Text>Main Charts</Text>
              <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                {ALL_CHARTS.main.map((chartID) => (
                  <Selectable
                    key={chartID}
                    header={chartID}
                    isSelected={chartsState.main.includes(chartID)}
                    onSelect={() => toggleChart(chartID, "main")}
                  >
                    {getChartComponent(chartID)}
                  </Selectable>
                ))}
              </SimpleGrid>

              <Text>Extra Charts</Text>
              <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                {ALL_CHARTS.extras.map((chartID) => (
                  <Selectable
                    key={chartID}
                    header={chartID}
                    isSelected={chartsState.extras.includes(chartID)}
                    onSelect={() => toggleChart(chartID, "extras")}
                  >
                    {getChartComponent(chartID)}
                  </Selectable>
                ))}
              </SimpleGrid>

              <Text>Custom Charts</Text>
              <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                {charts?.map((chart, index) => (
                  <SelectableCustomChart
                    index={index}
                    chart={chart} key={index}
                    chartsState={chartsState}
                    toggleChart={toggleChart}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="wizard" p="md">
            <CustomChartWizard
              onConfirm={({ name, chartConfig }) => {
                console.log(name, chartConfig);
                return insertChart(chartConfig)
                  .then(() => setActiveTab("charts"));
              }}
            />
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
}

function DynamicSelectFields({ first, value, onChange }) {
  const [color, setColor] = useState<string | undefined>(value?.color);
  const [field, setField] = useState<string | null>(value?.field || null);
  const [subField, setSubField] = useState<string | null>(value?.subField || null);
  const fieldOptions = useMemo(() => {
    switch (first) {
      case "runs":
        return ["name", "cost", "promptTokens", "completionTokens", "totalTokens"];
      // return ["id", "name", "type", "tags", "metadata", "cost", "feedback"];
      case "users":
        return ['id', 'createdAt', 'externalId', 'lastSeen', 'props', 'cost'];
      case "templates":
        return ["name", "cost", "promptTokens", "completionTokens", "totalTokens"];
      case "models":
        return [];
      default:
        return [];
    }
  }, [first]);

  const { data, isLoading } = useProjectSWR(() => {
    switch (field) {
      case "metadata":
        return "/filters/metadata";
      default:
        return null
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
  }, [field, subField, color])

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
        <ColorPicker value={color} onChange={setColor} size="xs" />
        // <ColorSelector color={color} setColor={setColor} />
      )}
    </Flex>
  );
}

function ColorSelector({ color, setColor }) {
  const colors = [
    { value: "red", label: "Red" },
    { value: "orange", label: "Orange" },
    { value: "yellow", label: "Yellow" },
    { value: "green", label: "Green" },
    { value: "blue", label: "Blue" },
    { value: "indigo", label: "Indigo" },
    { value: "violet", label: "Violet" },
  ];

  return (
    <Select
      data={colors} value={color}
      onChange={(value) => setColor(value)}
    />
  );
}

function DynamicSelect({ config, setConfig }) {
  const [first, setFirst] = useState(config.data.source || "runs");
  const firstOptions = ["runs", "users", "models", "templates"];

  const onChange = (index, value) => {
    setConfig((config) => {
      const newConfig = { ...config };
      newConfig.data.series[index] = value;
      return newConfig;
    });
  }

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
              ...config, data: {
                ...config.data,
                source: value
              }
            }));
          }}
        />
      </Box>
      <Box>
        <h5>First Series</h5>
        <DynamicSelectFields
          first={first}
          onChange={value => onChange(0, value)}
          value={config.data.series ? config.data.series[0] : null}
        />
        <h5>Second Series</h5>
        <DynamicSelectFields
          first={first}
          onChange={value => onChange(1, value)}
          value={config.data.series ? config.data.series[1] : null}
        />
        <h5>Third Series</h5>
        <DynamicSelectFields
          first={first}
          onChange={value => onChange(2, value)}
          value={config.data.series ? config.data.series[2] : null}
        />
      </Box>
    </Group>
  )
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

  const handlePropChange = (propName, value) => {
    setChartConfig((config) => ({
      ...config, props: {
        ...config.props,
        [propName]: value
      }
    }));
  };

  const convertCase = (camelStr) => {
    return (camelStr.charAt(0).toUpperCase() + camelStr.slice(1)).split(
      /(?=[A-Z])/,
    );
  };

  const renderPropInput = (prop, propName, value, handleValue) => {
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
  };

  const [dateRange, setDateRange] = useSessionStorage({
    key: "dateRange-analytics",
    getInitialValueInEffect: false,
    deserialize: deserializeDateRange,
    defaultValue: getDefaultDateRange(),
  });

  const [startDate, endDate] = dateRange;

  const { data, props, series } = useMemo(() => {
    const { name, data, props } = chartConfig;

    const chartData = (() => {
      if (!data.source || data.source === "runs") {
        return useTopModels({ startDate, endDate });
      } else if (data.source === "templates") {
        return useTopTemplates(startDate, endDate);
      } else if (data.source === "users") {
        // TODO: FIX!!
        return useExternalUsers({ startDate, endDate });
      } else {
        return useProjectSWR(() => null)
      }
    })();

    const series = data.series.map(serie => {
      if (!serie.field) return null;
      return {
        name: serie.field,
        color: serie.color
      }
    }).filter(Boolean);

    return { data: chartData, props, series }
  }, [chartConfig])

  return (
    <Grid pt="sm">
      <Grid.Col span={{ sm: 12, md: 6 }}>
        <Box>
          <h3>{selectedChart.name} Preview</h3>
          <selectedChart.component props={props} series={series} data={data} />
        </Box>
      </Grid.Col>

      <Grid.Col
        span={{ sm: 12, md: 6 }}
        style={{
          overflowY: "scroll",
          height: "45rem",
        }}
      >
        <Box mb="sm">
          <DynamicSelect config={chartConfig} setConfig={setChartConfig} />
        </Box>
        <Box>
          <h3>Chart Config</h3>
          {Object.keys(selectedChart.props).map((propName) => {
            return (
              <Box key={propName} mb="sm">
                {renderPropInput(
                  selectedChart.props[propName],
                  propName, chartConfig.props[propName],
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

function CustomChartWizard({ onConfirm }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [chartConfig, setChartConfig] = useState({
    name: CHARTS[0].name, props: {},
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
          <Select
            label="Select Chart"
            value={chartConfig.name}
            onChange={(name) => name && setChartConfig((config) => ({ ...config, name }))}
            data={CHARTS.map((chart) => chart.name)}
          />
        </Stepper.Step>
        <Stepper.Step label="Second step" description="Chart Configuration">
          <TextInput
            pt="sm"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            label="Chart Name"
            placeholder="My Custom Chart"
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
              onConfirm({ name, config: chartConfig })
                .then(() => setSaving(false));
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

function ConfirmModal({ title, opened, close, onConfirm }) {
  return (
    <Modal centered opened={opened} onClose={close} radius={"md"} title={title}>
      <Group align="right" mt="md">
        <Button variant="subtle" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="filled"
          color="red"
          onClick={() => {
            onConfirm();
            close();
          }}
        >
          Confirm
        </Button>
      </Group>
    </Modal>
  );
}

// TODO: typescript everywhere
export default function Analytics() {
  const router = useRouter();
  const [dateRange, setDateRange] = useSessionStorage({
    key: "dateRange-analytics",
    getInitialValueInEffect: false,
    deserialize: deserializeDateRange,
    defaultValue: getDefaultDateRange(),
  });

  const [startDate, endDate] = dateRange;

  const [granularity, setGranularity] = useLocalStorage<Granularity>({
    key: "granularity-analytics",
    getInitialValueInEffect: false,
    defaultValue: determineGranularity(dateRange),
  });

  const [checks, setChecks] = useQueryState("filters", {
    parse: (value) => deserializeLogic(value, true),
    serialize: serializeLogic,
    defaultValue: DEFAULT_CHECK,
  });

  const serializedChecks = useMemo(() => serializeLogic(checks), [checks]);

  const [showCheckBar, setShowCheckBar] = useState(false);

  const { project } = useProject();

  const { data: topModels, isLoading: topModelsLoading } = useTopModels({
    startDate,
    endDate,
    checks: serializedChecks,
  });

  const { data: topTemplates, isLoading: topTemplatesLoading } =
    useTopTemplates(startDate, endDate, serializedChecks);

  const { users: topUsers, loading: topUsersLoading } = useExternalUsers({
    startDate,
    endDate,
    checks: serializedChecks,
  });

  const showBar =
    showCheckBar ||
    checks?.filter((f) => f !== "AND" && !["search", "type"].includes(f.id))
      .length > 0;

  const commonChartData = {
    startDate: startDate,
    endDate: endDate,
    granularity: granularity,
    serializedChecks: serializedChecks,
  };

  // This would possibly be fetched from the server when used with custom charts
  const chartProps = {
    tokens: {
      dataKey: "tokens",
      splitBy: "name",
      props: ["tokens"],
      agg: "sum",
      title: "Tokens",
      description: "The number of tokens generated by your LLM calls",
    },
    costs: {
      dataKey: "costs",
      splitBy: "name",
      props: ["costs"],
      agg: "sum",
      title: "Costs",
      description: "The total cost generated by your LLM calls",
      formatter: formatCost,
    },
    errors: {
      dataKey: "errors",
      title: "Errors Volume",
      description: "How many errors were captured in your app",
      agg: "sum",
      props: ["errors"],
      colors: ["red"],
    },
    "users/new": {
      dataKey: "users/new",
      props: ["users"],
      agg: "sum",
      title: "New Users",
      description: "The number of new tracked users for the selected period",
    },
    "users/active": {
      dataKey: "users/active",
      props: ["users"],
      title: "Active Users",
      colors: ["violet"],
      description: "The number of active users for the selected period",
    },
    "users/average-cost": {
      dataKey: "users/average-cost",
      props: ["cost"],
      title: "Avg. User Cost",
      description: "The average cost of each of your users",
      formatter: formatCost,
    },
    "run-types": {
      dataKey: "run-types",
      splitBy: "type",
      props: ["runs"],
      agg: "sum",
      title: "Runs Volume",
      description: "The total number of runs generated by your app",
    },
    latency: {
      dataKey: "latency",
      props: ["avgDuration"],
      title: "Avg. LLM Latency",
      description: "The number of active users",
      formatter: (value) => `${value.toFixed(2)}s`,
      colors: ["yellow"],
    },
    "feedback-ratio": {
      dataKey: "feedback-ratio",
      props: ["ratio"],
      agg: "avg",
      title: "Thumbs Up/Down Ratio",
      description: "The ratio of thumbs up to thumbs down feedback",
    },
  };

  const [editMode, setEditMode] = useState(true);
  const [
    chartSelectedOpened,
    { open: openChartSelector, close: closeChartSelector },
  ] = useDisclosure(true);
  const [saveAsOpened, { open: openSaveAs, close: closeSaveAs }] =
    useDisclosure(false);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const [confirmReset, { open: openConfirmReset, close: closeConfirmReset }] =
    useDisclosure(false);

  const { insert: insertDashboard } = useDashboards();

  const [dashboardID, setDashboardID] = useQueryState<string | undefined>(
    "dashboard",
    {
      ...parseAsString,
      history: "push",
    },
  );

  const {
    dashboard,
    update: updateDashboard,
    remove: removeDashboard,
    loading: dashboardLoading,
  } = useDashboard(dashboardID);

  // Temporary charts state used in edit mode
  const [tempChartsState, setTempChartsState] = useState(
    dashboard ? dashboard.charts : DEFAULT_CHARTS,
  );

  const chartsState = useMemo(() => {
    if (editMode) return tempChartsState;
    return dashboard ? dashboard.charts : DEFAULT_CHARTS;
  }, [editMode, tempChartsState, dashboard]);

  useEffect(() => {
    setTempChartsState(dashboard ? dashboard.charts : DEFAULT_CHARTS);
  }, [dashboard, dashboardLoading]);

  const getChartConfig = () => {
    return {
      id: Date.now(),
      splitBy: "Department",
      groupBy: "Month",
    };
  };

  const getChartComponent = (id: string) => {
    switch (id) {
      case "models":
        return <TopModels topModels={topModels} isLoading={topModelsLoading} />;
      case "templates":
        return (
          <TopTemplates
            topTemplates={topTemplates}
            isLoading={topTemplatesLoading}
          />
        );
      case "users":
        return <TopUsersCard topUsers={topUsers} isLoading={topUsersLoading} />;

      case "top-topics":
        return <TopTopics />;
      case "sentiments":
        return <Sentiment />;

      default:
        if (chartProps[id])
          return <AnalyticsChart {...chartProps[id]} {...commonChartData} />;

        return <CustomChart chartID={id} />;
    }
  };

  const onToggleMode = async () => {
    if (editMode) {
      // Exiting edit mode

      if (dashboard) {
        await updateDashboard({ charts: tempChartsState });
      } else {
        return openSaveAs();
      }
    } else {
      setTempChartsState(dashboard?.charts || DEFAULT_CHARTS);
    }

    setEditMode(!editMode);
  };

  const toggleChart = (chartID: string, group: string) => {
    const newState = { ...tempChartsState };
    if (tempChartsState[group].includes(chartID)) {
      newState[group] = newState[group].filter((id) => id !== chartID);
    } else {
      newState[group].push(chartID);
    }
    setTempChartsState(newState);
  };

  const createDashboard = async (name: string) => {
    if (!name) {
      throw new Error("Dashboard name is required");
    }

    const entry = await insertDashboard({
      name,
      charts: tempChartsState,
    });
    setDashboardID(entry.id);

    onToggleMode();
  };

  const handleDropChart = (item: { id: string }, id, chartID) => {
    const newState = { ...tempChartsState };
    const itemIndex = newState[id].indexOf(item.id);
    const index = newState[id].indexOf(chartID);

    newState[id].splice(itemIndex, 1);
    newState[id].splice(index, 0, item.id);

    setTempChartsState(newState);
  };

  return (
    <Empty
      showProjectId
      Icon={IconChartAreaLine}
      title="Waiting for data..."
      description="Analytics will appear here once you have some data."
      enable={!project?.activated || dashboardLoading}
    >
      <NextSeo title="Analytics" />

      <ChartSelector
        opened={chartSelectedOpened}
        toggleChart={toggleChart}
        close={closeChartSelector}
        chartsState={tempChartsState}
        getChartComponent={getChartComponent}
      />

      <SaveAsModal
        opened={saveAsOpened}
        close={closeSaveAs}
        title="Dashboard Name"
        onConfirm={createDashboard}
      />

      <ConfirmModal
        opened={confirmOpened}
        close={closeConfirm}
        onConfirm={() => {
          removeDashboard();
          router.push("/analytics");
        }}
        title={`Delete dashboard "${dashboard?.name}"`}
      />

      <ConfirmModal
        opened={confirmReset}
        close={closeConfirmReset}
        onConfirm={() => {
          setTempChartsState(DEFAULT_CHARTS);
        }}
        title={`Reset to defult charts?`}
      />

      <DndProvider backend={HTML5Backend}>
        <Stack gap="lg">
          <Group gap="xs">
            <Group gap={0}>
              <DateRangeSelect
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
              <DateRangePicker
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
              <GranularitySelect
                dateRange={dateRange}
                granularity={granularity}
                setGranularity={setGranularity}
              />
            </Group>

            {!showBar && (
              <Button
                variant="subtle"
                onClick={() => setShowCheckBar(true)}
                leftSection={<IconFilter size={12} />}
                size="xs"
              >
                Add filters
              </Button>
            )}

            <Group gap="sm" ml="auto">
              {editMode && (
                <Group>
                  <ActionIcon
                    variant="outline"
                    onClick={openChartSelector}
                    size="sm"
                  >
                    <IconPlus size={12} />
                  </ActionIcon>
                  <ActionIcon
                    color="red"
                    variant="outline"
                    onClick={openConfirmReset}
                    size="sm"
                  >
                    <IconRestore size={12} />
                  </ActionIcon>
                </Group>
              )}

              <Button
                variant={editMode ? "filled" : "outline"}
                onClick={onToggleMode}
                leftSection={
                  editMode ? <IconCheck size={12} /> : <IconEdit size={12} />
                }
                size="xs"
              >
                {editMode ? "Save" : "Edit"}
              </Button>

              {editMode && dashboard && (
                <Button
                  variant="outline"
                  onClick={openSaveAs}
                  leftSection={<IconCopyCheckFilled size={12} />}
                  size="xs"
                >
                  Save As
                </Button>
              )}

              {editMode && (
                <ActionIcon
                  color="red"
                  variant="outline"
                  onClick={() => {
                    console.log(dashboard?.charts, tempChartsState);
                    setTempChartsState(dashboard?.charts || DEFAULT_CHARTS);
                    setEditMode(false);
                  }}
                  size="sm"
                >
                  <IconCancel size={12} />
                </ActionIcon>
              )}
            </Group>

            {dashboard && !editMode && (
              <Button
                color="red"
                variant="outline"
                onClick={openConfirm}
                leftSection={<IconTrash size={12} />}
                size="xs"
              >
                Delete
              </Button>
            )}
          </Group>

          {showBar && (
            <CheckPicker
              minimal
              onChange={setChecks}
              defaultOpened={showCheckBar}
              value={checks}
              restrictTo={(filter) =>
                ["tags", "models", "users", "metadata"].includes(filter.id)
              }
            />
          )}

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {chartsState.main.map((chartID) => (
              <Droppable
                key={chartID}
                onDrop={(item) => handleDropChart(item, "main", chartID)}
                editMode={editMode}
                type={DND_TYPES.MAIN}
              >
                <Draggable
                  id={chartID}
                  editMode={editMode}
                  type={DND_TYPES.MAIN}
                >
                  {getChartComponent(chartID)}
                </Draggable>
              </Droppable>
            ))}
          </SimpleGrid>

          <Droppable
            onDrop={(item) =>
              handleDropChart(item, "extras", chartsState.extras[0])
            }
            editMode={editMode}
            type={DND_TYPES.EXTRAS}
          >
            <Draggable
              id={chartsState.extras[0]}
              editMode={editMode}
              type={DND_TYPES.EXTRAS}
            >
              {getChartComponent(chartsState.extras[0])}
            </Draggable>
          </Droppable>

          <Droppable
            onDrop={(item) =>
              handleDropChart(item, "extras", chartsState.extras[0])
            }
            editMode={editMode}
            type={DND_TYPES.EXTRAS}
          >
            <Draggable
              id={chartsState.extras[0]}
              editMode={editMode}
              type={DND_TYPES.EXTRAS}
            >
              <MantineBarChart
                h={300}
                series={[
                  // { name: "totalTokens", color: "indigo.6" },
                  { name: "promptTokens", color: "blue.6" },
                  { name: "completionTokens", color: "teal.6" },
                ]}
                dataKey="cost"
                data={[
                  {
                    "name": "claude-3-opus-20240229",
                    "promptTokens": 60993,
                    "completionTokens": 13375,
                    "totalTokens": 74368,
                    "cost": 1.9180200000000016
                  },
                  {
                    "name": "gpt-3.5-turbo",
                    "promptTokens": 7646,
                    "completionTokens": 3218,
                    "totalTokens": 10864,
                    "cost": 0.00864
                  },
                  {
                    "name": "claude-3-haiku-20240307",
                    "promptTokens": 7600,
                    "completionTokens": 1645,
                    "totalTokens": 9245,
                    "cost": 0.0039562500000000006
                  },
                  {
                    "name": "gpt-4-turbo",
                    "promptTokens": 2300,
                    "completionTokens": 1153,
                    "totalTokens": 3453,
                    "cost": 0.05758999999999999
                  },
                  {
                    "name": "claude-3-5-sonnet-20240620",
                    "promptTokens": 34,
                    "completionTokens": 113,
                    "totalTokens": 147,
                    "cost": 0.001797
                  }
                ]} />
            </Draggable>
          </Droppable>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {chartsState.extras.slice(1).map((chartID) => (
              <Droppable
                key={chartID}
                onDrop={(item) => handleDropChart(item, "extras", chartID)}
                editMode={editMode}
                type={DND_TYPES.EXTRAS}
              >
                <Draggable
                  id={chartID}
                  editMode={editMode}
                  type={DND_TYPES.EXTRAS}
                >
                  {getChartComponent(chartID)}
                </Draggable>
              </Droppable>
            ))}
          </SimpleGrid>
        </Stack>
      </DndProvider>
    </Empty>
  );
}
