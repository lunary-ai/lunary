import LineChart from "@/components/analytics/LineChart";
import TopModels from "@/components/analytics/TopModels";
import TopTemplates from "@/components/analytics/TopTemplates";
import TopUsersCard from "@/components/analytics/TopUsers";
import CheckPicker from "@/components/checks/Picker";
import Empty from "@/components/layout/Empty";
import { useProject } from "@/utils/dataHooks";
import {
  useAnalyticsChartData,
  useTopModels,
  useTopTemplates,
} from "@/utils/dataHooks/analytics";
import { useExternalUsers } from "@/utils/dataHooks/external-users";
import { formatCost } from "@/utils/format";

import {
  Box,
  Button,
  Card,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";

import {
  useInViewport,
  useLocalStorage,
  useSessionStorage,
} from "@mantine/hooks";
import {
  IconCalendar,
  IconChartAreaLine,
  IconCheck,
  IconEdit,
  IconFilter,
  IconPlus,
} from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { deserializeLogic, serializeLogic } from "shared";

import { createSwapy, Swapy } from "swapy";

import { useDisclosure } from "@mantine/hooks";
import {
  AreaChart,
  BarChart,
  RadarChart,
  ScatterChart,
  DonutChart,
} from "@mantine/charts";
import { ResponsiveContainer } from "recharts";

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
        agg={agg}
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

function Draggable({ children }) {
  return <Box data-swapy-item={Math.random()}>{children}</Box>;
}

function Droppable({ children }) {
  return <Box data-swapy-slot={Math.random()}>{children}</Box>;
}

function DroppableContext({ enable, children, dependencies }) {
  const contextID = `dndcontext-${Math.round(Math.random() * 100)}`;
  const swapyRef = useRef<Swapy | null>(null);

  useEffect(() => {
    if (swapyRef.current) {
      swapyRef.current.enable(enable);
      swapyRef.current.destroy();
      return;
    }

    if (!enable) return;

    const container = document.querySelector(`#${contextID}`);
    swapyRef.current = createSwapy(container, {
      continuousMode: true,
    });
    swapyRef.current.enable(enable);

    return () => {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    };
  }, [enable, ...dependencies]);

  return <Box id={contextID}>{children}</Box>;
}

// TODO: typescript everywhere
export default function Analytics() {
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

  const [editMode, setEditMode] = useState(true);
  const [opened, { open: openChartSelector, close: closeChartSelector }] =
    useDisclosure(editMode);

  return (
    <Empty
      Icon={IconChartAreaLine}
      title="Waiting for data..."
      description="Analytics will appear here once you have some data."
      showProjectId
      enable={!project?.activated}
    >
      <NextSeo title="Analytics" />

      <Modal
        opened={opened}
        onClose={closeChartSelector}
        title="Add Chart"
        centered
        size="80%"
        radius={0}
        transitionProps={{ transition: "fade", duration: 200 }}
      >
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Card>
            <AreaChart
              h={300}
              data={[
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
              ]}
              dataKey="date"
              series={[
                { name: "Apples", color: "indigo.6" },
                { name: "Oranges", color: "blue.6" },
                { name: "Tomatoes", color: "teal.6" },
              ]}
              curveType="linear"
            />
          </Card>
          <Card>
            <AreaChart
              h={300}
              data={[
                {
                  date: "Mar 22",
                  Apples: 110,
                },
                {
                  date: "Mar 23",
                  Apples: 60,
                },
                {
                  date: "Mar 24",
                  Apples: -80,
                },
                {
                  date: "Mar 25",
                  Apples: 40,
                },
                {
                  date: "Mar 26",
                  Apples: -40,
                },
                {
                  date: "Mar 27",
                  Apples: 80,
                },
              ]}
              dataKey="date"
              type="split"
              strokeWidth={1}
              dotProps={{ r: 2, strokeWidth: 1 }}
              activeDotProps={{ r: 3, strokeWidth: 1 }}
              series={[{ name: "Apples", color: "bright" }]}
              splitColors={["violet", "orange"]}
            />
          </Card>
          <Card>
            <AreaChart
              h={300}
              data={[
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
              ]}
              dataKey="date"
              type="stacked"
              withLegend
              legendProps={{ verticalAlign: "bottom" }}
              series={[
                { name: "Apples", label: "Apples sales", color: "indigo.6" },
                { name: "Oranges", label: "Oranges sales", color: "blue.6" },
                { name: "Tomatoes", label: "Tomatoes sales", color: "teal.6" },
              ]}
            />
          </Card>
          <Card>
            <BarChart
              h={300}
              data={[
                {
                  month: "January",
                  Smartphones: 1200,
                  Laptops: 900,
                  Tablets: 200,
                },
                {
                  month: "February",
                  Smartphones: 1900,
                  Laptops: 1200,
                  Tablets: 400,
                },
                {
                  month: "March",
                  Smartphones: 400,
                  Laptops: 1000,
                  Tablets: 200,
                },
                {
                  month: "April",
                  Smartphones: 1000,
                  Laptops: 200,
                  Tablets: 800,
                },
                {
                  month: "May",
                  Smartphones: 800,
                  Laptops: 1400,
                  Tablets: 1200,
                },
                {
                  month: "June",
                  Smartphones: 750,
                  Laptops: 600,
                  Tablets: 1000,
                },
              ]}
              dataKey="month"
              valueFormatter={(value) =>
                new Intl.NumberFormat("en-US").format(value)
              }
              series={[
                { name: "Smartphones", color: "violet.6" },
                { name: "Laptops", color: "blue.6" },
                { name: "Tablets", color: "teal.6" },
              ]}
            />
          </Card>
          <Card>
            <BarChart
              h={300}
              data={[
                {
                  month: "January",
                  Smartphones: 1200,
                  Laptops: 900,
                  Tablets: 200,
                },
                {
                  month: "February",
                  Smartphones: 1900,
                  Laptops: 1200,
                  Tablets: 400,
                },
                {
                  month: "March",
                  Smartphones: 400,
                  Laptops: 1000,
                  Tablets: 200,
                },
                {
                  month: "April",
                  Smartphones: 1000,
                  Laptops: 200,
                  Tablets: 800,
                },
                {
                  month: "May",
                  Smartphones: 800,
                  Laptops: 1400,
                  Tablets: 1200,
                },
                {
                  month: "June",
                  Smartphones: 750,
                  Laptops: 600,
                  Tablets: 1000,
                },
              ]}
              dataKey="month"
              series={[
                { name: "Smartphones", color: "violet.6" },
                { name: "Laptops", color: "blue.6" },
                { name: "Tablets", color: "teal.6" },
              ]}
              tickLine="y"
            />
          </Card>
          <Card>
            <BarChart
              h={300}
              data={[
                {
                  month: "January",
                  Smartphones: 1200,
                  Laptops: 900,
                  Tablets: 200,
                },
                {
                  month: "February",
                  Smartphones: 1900,
                  Laptops: 1200,
                  Tablets: 400,
                },
                {
                  month: "March",
                  Smartphones: 400,
                  Laptops: 1000,
                  Tablets: 200,
                },
                {
                  month: "April",
                  Smartphones: 1000,
                  Laptops: 200,
                  Tablets: 800,
                },
                {
                  month: "May",
                  Smartphones: 800,
                  Laptops: 1400,
                  Tablets: 1200,
                },
                {
                  month: "June",
                  Smartphones: 750,
                  Laptops: 600,
                  Tablets: 1000,
                },
              ]}
              dataKey="month"
              withLegend
              legendProps={{ verticalAlign: "bottom", height: 50 }}
              series={[
                { name: "Smartphones", color: "violet.6" },
                { name: "Laptops", color: "blue.6" },
                { name: "Tablets", color: "teal.6" },
              ]}
            />
          </Card>
          <Card>
            <RadarChart
              h={300}
              data={[
                {
                  product: "Apples",
                  sales: 120,
                },
                {
                  product: "Oranges",
                  sales: 98,
                },
                {
                  product: "Tomatoes",
                  sales: 86,
                },
                {
                  product: "Grapes",
                  sales: 99,
                },
                {
                  product: "Bananas",
                  sales: 85,
                },
                {
                  product: "Lemons",
                  sales: 65,
                },
              ]}
              dataKey="product"
              withPolarRadiusAxis
              series={[{ name: "sales", color: "blue.4", opacity: 0.2 }]}
            />
          </Card>
          <Card>
            <ScatterChart
              h={350}
              data={[
                {
                  color: "blue.5",
                  name: "Group 1",
                  data: [
                    { age: 25, BMI: 20 },
                    { age: 30, BMI: 22 },
                    { age: 35, BMI: 18 },
                    { age: 40, BMI: 25 },
                    { age: 45, BMI: 30 },
                    { age: 28, BMI: 15 },
                    { age: 22, BMI: 12 },
                    { age: 50, BMI: 28 },
                    { age: 32, BMI: 19 },
                    { age: 48, BMI: 31 },
                    { age: 26, BMI: 24 },
                    { age: 38, BMI: 27 },
                    { age: 42, BMI: 29 },
                    { age: 29, BMI: 16 },
                    { age: 34, BMI: 23 },
                    { age: 44, BMI: 33 },
                    { age: 23, BMI: 14 },
                    { age: 37, BMI: 26 },
                    { age: 49, BMI: 34 },
                    { age: 27, BMI: 17 },
                    { age: 41, BMI: 32 },
                    { age: 31, BMI: 21 },
                    { age: 46, BMI: 35 },
                    { age: 24, BMI: 13 },
                    { age: 33, BMI: 22 },
                    { age: 39, BMI: 28 },
                    { age: 47, BMI: 30 },
                    { age: 36, BMI: 25 },
                    { age: 43, BMI: 29 },
                    { age: 21, BMI: 11 },
                  ],
                },
              ]}
              dataKey={{ x: "age", y: "BMI" }}
              xAxisLabel="Age"
              yAxisLabel="BMI"
            />
          </Card>
        </SimpleGrid>
      </Modal>

      <DroppableContext
        enable={editMode && !opened}
        dependencies={[topUsers, topModels, topTemplates, checks]}
      >
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
                <Button
                  variant="outline"
                  leftSection={<IconPlus size={12} />}
                  onClick={openChartSelector}
                  size="xs"
                >
                  Add
                </Button>
              )}

              <Button
                variant={editMode ? "filled" : "outline"}
                onClick={() => setEditMode(!editMode)}
                leftSection={
                  editMode ? <IconCheck size={12} /> : <IconEdit size={12} />
                }
                size="xs"
              >
                {editMode ? "Done" : "Edit"}
              </Button>
            </Group>
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
            <Droppable>
              <Draggable>
                <TopModels topModels={topModels} isLoading={topModelsLoading} />
              </Draggable>
            </Droppable>

            <Droppable>
              <Draggable>
                <TopTemplates
                  topTemplates={topTemplates}
                  isLoading={topTemplatesLoading}
                />
              </Draggable>
            </Droppable>

            <Droppable>
              <Draggable>
                <TopUsersCard topUsers={topUsers} isLoading={topUsersLoading} />
              </Draggable>
            </Droppable>
          </SimpleGrid>

          {/* <AreaChart
            h={300}
            data={data}
            dataKey="date"
            type="stacked"
            series={series}
            withDots={false}
            tooltipProps={{
              content: ({ label, payload }) => (
                <ChartTooltip label={label} payload={payload} />
              ),
            }}
          /> */}

          <Droppable>
            <Draggable>
              <AnalyticsChart
                dataKey="tokens"
                splitBy="name"
                props={["tokens"]}
                agg="sum"
                title="Tokens"
                description="The number of tokens generated by your LLM calls"
                {...commonChartData}
              />
            </Draggable>
          </Droppable>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Droppable>
              <Draggable>
                <AnalyticsChart
                  dataKey="costs"
                  splitBy="name"
                  props={["costs"]}
                  agg="sum"
                  title="Costs"
                  description="The total cost generated by your LLM calls"
                  formatter={formatCost}
                  {...commonChartData}
                />
              </Draggable>
            </Droppable>

            <Droppable>
              <Draggable>
                <AnalyticsChart
                  dataKey="errors"
                  title="Errors Volume"
                  description="How many errors were captured in your app"
                  agg="sum"
                  props={["errors"]}
                  colors={["red"]}
                  {...commonChartData}
                />
              </Draggable>
            </Droppable>

            {checks.length < 2 && (
              // Only show new users if no filters are applied, as it's not a metric that can be filtered
              <>
                <Droppable>
                  <Draggable>
                    <AnalyticsChart
                      dataKey="users/new"
                      props={["users"]}
                      agg="sum"
                      title="New Users"
                      description="The number of new tracked users for the selected period"
                      {...commonChartData}
                    />
                  </Draggable>
                </Droppable>

                <Droppable>
                  <Draggable>
                    <AnalyticsChart
                      dataKey="users/active"
                      props={["users"]}
                      title="Active Users"
                      colors={["violet"]}
                      description="The number of active users for the selected period"
                      {...commonChartData}
                    />
                  </Draggable>
                </Droppable>
              </>
            )}

            <Droppable>
              <Draggable>
                <AnalyticsChart
                  dataKey="users/average-cost"
                  props={["cost"]}
                  title="Avg. User Cost"
                  description="The average cost of each of your users"
                  formatter={formatCost}
                  {...commonChartData}
                />
              </Draggable>
            </Droppable>

            <Droppable>
              <Draggable>
                <AnalyticsChart
                  dataKey="run-types"
                  splitBy="type"
                  props={["runs"]}
                  agg="sum"
                  title="Runs Volume"
                  description="The total number of runs generated by your app"
                  {...commonChartData}
                />
              </Draggable>
            </Droppable>

            <Droppable>
              <Draggable>
                <AnalyticsChart
                  dataKey="latency"
                  props={["avgDuration"]}
                  title="Avg. LLM Latency"
                  description="The number of active users"
                  formatter={(value) => `${value.toFixed(2)}s`}
                  colors={["yellow"]}
                  {...commonChartData}
                />
              </Draggable>
            </Droppable>

            <Droppable>
              <Draggable>
                <AnalyticsChart
                  dataKey="feedback-ratio"
                  props={["ratio"]}
                  agg="avg"
                  title="Thumbs Up/Down Ratio"
                  description="The ratio of thumbs up to thumbs down feedback"
                  {...commonChartData}
                />
              </Draggable>
            </Droppable>
          </SimpleGrid>
        </Stack>
      </DroppableContext>
    </Empty>
  );
}
