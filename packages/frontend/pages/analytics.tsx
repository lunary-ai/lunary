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
  ActionIcon,
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
  IconMinus,
  IconPlus,
  IconRestore,
} from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { deserializeLogic, serializeLogic } from "shared";

import { createSwapy, Swapy } from "swapy";
import { useDisclosure } from "@mantine/hooks";
import { ALL } from "dns";

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
  ],
  customs: [],
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

function Draggable({ id, children }) {
  return (
    <Box data-swapy-item={id} h={"100%"}>
      {children}
    </Box>
  );
}

function Droppable({ slot, children }) {
  return (
    <Box data-swapy-slot={slot} h={"100%"}>
      {children}
    </Box>
  );
}

function Selectable({
  isSelected,
  children,
  onSelect,
}: {
  isSelected?: boolean;
  children: any;
  onSelect: () => any;
}) {
  const [selected, setSelected] = useState(!!isSelected);

  const onSelected = () => {
    setSelected(!selected);
    onSelect?.();
  };

  return (
    <Card withBorder>
      <Card.Section
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <ActionIcon
          onClick={onSelected}
          variant={selected ? "filled" : "outline"}
          size="xs"
          m="sm"
        >
          {selected ? <IconMinus size={12} /> : <IconPlus size={12} />}
        </ActionIcon>
      </Card.Section>

      <Card.Section>{children}</Card.Section>
    </Card>
  );
}

function DroppableContext({ enable, children, dependencies }) {
  const contextID = `dnd-context-${Math.round(Math.random() * 100)}`;
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

    swapyRef.current.onSwap(({ data }) => {
      const mapping: { [index: string]: (string | null)[] } = {
        main: [],
        extras: [],
        customs: [],
      };

      data.array.forEach((item) => {
        if (item.slotId.startsWith("main:")) {
          mapping.main.push(item.itemId);
        } else if (item.slotId.startsWith("extra:")) {
          mapping.extras.push(item.itemId);
        } else {
          mapping.customs.push(item.itemId);
        }
      });

      localStorage.chartsState = JSON.stringify(mapping);
    });

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

  const [editMode, setEditMode] = useState(false);
  const [opened, { open: openChartSelector, close: closeChartSelector }] =
    useDisclosure(editMode);

  const [chartsState, setChartsState] = useState(
    (localStorage.chartsState && JSON.parse(localStorage.chartsState)) ||
      ALL_CHARTS,
  );

  const [newChartsState, setNewChartsState] = useState(chartsState);

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

      default:
        if (!chartProps[id]) return;
        return <AnalyticsChart {...chartProps[id]} {...commonChartData} />;
    }
  };

  const toggleChart = (chartID: string, group: string) => {
    const newState = { ...newChartsState };
    if (newChartsState[group].includes(chartID)) {
      newState[group] = newState[group].filter((id) => id !== chartID);
    } else {
      newState[group].push(chartID);
    }
    setNewChartsState(newState);
  };

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
        <Stack mah={"80vh"} style={{ overflowY: "auto" }}>
          <Text>Main Charts</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {ALL_CHARTS.main.map((chartID) => (
              <Selectable
                isSelected={chartsState.main.includes(chartID)}
                onSelect={() => toggleChart(chartID, "main")}
              >
                {getChartComponent(chartID)}
              </Selectable>
            ))}
          </SimpleGrid>

          <Text>Extra Charts</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {ALL_CHARTS.extras.map((chartID) => (
              <Selectable
                isSelected={chartsState.extras.includes(chartID)}
                onSelect={() => toggleChart(chartID, "extras")}
              >
                {getChartComponent(chartID)}
              </Selectable>
            ))}
          </SimpleGrid>
        </Stack>

        <Group gap="sm" mt="10" style={{ justifyContent: "flex-end" }}>
          <Button variant="subtle" onClick={closeChartSelector}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setChartsState(newChartsState);
              closeChartSelector();
            }}
          >
            Apply
          </Button>
        </Group>
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
                    onClick={() => setChartsState(ALL_CHARTS)}
                    size="sm"
                  >
                    <IconRestore size={12} />
                  </ActionIcon>
                </Group>
              )}

              <Button
                variant={editMode ? "filled" : "outline"}
                onClick={() => {
                  setEditMode(!editMode);
                }}
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
            {chartsState.main.map((chartID, index) => (
              <Droppable slot={`main:${index + 1}`}>
                <Draggable id={chartID}>{getChartComponent(chartID)}</Draggable>
              </Droppable>
            ))}
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

          <Droppable slot="extra:1">
            <Draggable id={chartsState.extras[0]}>
              {getChartComponent(chartsState.extras[0])}
            </Draggable>
          </Droppable>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {chartsState.extras.slice(1).map((chartID, index) => (
              <Droppable slot={`extra:${index + 2}`}>
                <Draggable id={chartID}>{getChartComponent(chartID)}</Draggable>
              </Droppable>
            ))}
          </SimpleGrid>
        </Stack>
      </DroppableContext>
    </Empty>
  );
}
