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
  Grid,
  Group,
  Menu,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";

import { useInViewport, useLocalStorage } from "@mantine/hooks";
import {
  IconCalendar,
  IconCancel,
  IconChartAreaLine,
  IconChartLine,
  IconCheck,
  IconCopyCheckFilled,
  IconDotsVertical,
  IconEdit,
  IconFilter,
  IconPin,
  IconPinned,
  IconPlus,
  IconStackPop,
  IconTimeline,
  IconTrash,
} from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { deserializeLogic, serializeLogic } from "shared";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { useDisclosure } from "@mantine/hooks";
import { useDashboard, useDashboards } from "@/utils/dataHooks/dashboards";
import { useRouter } from "next/router";
import TopTopics from "@/components/analytics/Charts/TopTopics";
import Sentiment from "@/components/analytics/Charts/Sentiment";

import { useCharts } from "@/utils/dataHooks/charts";

import {
  ALL_CHARTS,
  DEFAULT_CHARTS,
  deserializeDateRange,
  getDefaultDateRange,
} from "@/utils/analytics";
import RenamableField from "@/components/blocks/RenamableField";
import {
  SelectableCustomChart,
  CustomChartCreator,
  CustomChart,
} from "@/components/analytics/Creator";
import { SaveAsModal, ConfirmModal } from "@/components/analytics/Modals";
import {
  Selectable,
  Droppable,
  Draggable,
} from "@/components/analytics/Wrappers";

import type { CheckLogic } from "shared";

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
  // dateRange: [Date, Date];
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
    if (granularity === "hourly") {
      setOptions([{ value: "hourly", label: "Hourly" }]);
    } else if (granularity === "daily") {
      setOptions([{ value: "daily", label: "Daily" }]);
    } else {
      setOptions([
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
      ]);
    }
  }, [granularity]);

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
              All Insights
            </Tabs.Tab>
            <Tabs.Tab
              value="wizard"
              leftSection={<IconPlus />}
              onClick={() => setActiveTab("wizard")}
            >
              Custom Insight
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="charts" p="md">
            <Stack mah={"75vh"} style={{ overflowY: "auto" }}>
              <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                {ALL_CHARTS.main.map((chartID) => (
                  <Selectable
                    key={chartID}
                    header={chartID}
                    isSelected={chartsState.includes(chartID)}
                    onSelect={() => toggleChart(chartID)}
                  >
                    {getChartComponent(chartID)}
                  </Selectable>
                ))}
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                {ALL_CHARTS.extras.map((chartID) => (
                  <Selectable
                    key={chartID}
                    header={chartID}
                    isSelected={chartsState.includes(chartID)}
                    onSelect={() => toggleChart(chartID)}
                  >
                    {getChartComponent(chartID)}
                  </Selectable>
                ))}
              </SimpleGrid>

              <Text>Custom Charts</Text>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                {charts?.map((chart, index) => (
                  <SelectableCustomChart
                    index={index}
                    chart={chart}
                    key={index}
                    chartsState={chartsState}
                    toggleChart={toggleChart}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="wizard" p="md">
            <CustomChartCreator
              onConfirm={({ name, config }) => {
                return insertChart({ name, type: config.name, config }).then(
                  () => setActiveTab("charts"),
                );
              }}
            />
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
}

// TODO: typescript everywhere
export default function Analytics() {
  const router = useRouter();

  const [pinnedDashboard, setPinnedDashboard] = useLocalStorage<
    string | undefined
  >({
    key: "dashboard",
  });

  const [dashboardID, setDashboardID] = useQueryState<string | undefined>(
    "dashboard",
    {
      ...parseAsString,
      history: "push",
    },
  );

  if (!dashboardID && pinnedDashboard) {
    setDashboardID(pinnedDashboard);
  }

  const {
    dashboard,
    update: updateDashboard,
    remove: removeDashboardFn,
    loading: dashboardLoading,
  } = useDashboard(dashboardID);

  useEffect(() => {
    if (!dashboardLoading && !dashboard) {
      if (dashboardID) setDashboardID(null);
    }
  }, [dashboardLoading]);

  const { dateRange, granularity, checks } = useMemo(() => {
    if (!dashboard) {
      const dateRange = getDefaultDateRange();
      return {
        dateRange,
        granularity: determineGranularity(dateRange),
        checks: DEFAULT_CHECK as CheckLogic,
      };
    }

    const dateRange = deserializeDateRange(dashboard.filters.dateRange);

    return {
      dateRange,
      granularity: determineGranularity(dateRange),
      checks: deserializeLogic(dashboard.filters.checks, true),
    };
  }, [dashboard, dashboard?.filters]);

  const [startDate, endDate] = dateRange;

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
  const [
    chartSelectedOpened,
    { open: openChartSelector, close: closeChartSelector },
  ] = useDisclosure(false);
  const [saveAsOpened, { open: openSaveAs, close: closeSaveAs }] =
    useDisclosure(false);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const [confirmReset, { open: openConfirmReset, close: closeConfirmReset }] =
    useDisclosure(false);

  const { insert: insertDashboard } = useDashboards();

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

  function removeDashboard() {
    removeDashboardFn();
    if (pinnedDashboard === dashboard?.id) {
      setPinnedDashboard("");
    }
    router.push("/dashboards");
  }

  function setDateRange(dateRange) {
    dashboard &&
      updateDashboard({
        filters: {
          ...dashboard.filters,
          dateRange: [dateRange[0].toISOString(), dateRange[1].toISOString()],
        },
      });
  }

  function setGranularity(granularity) {
    dashboard &&
      updateDashboard({
        filters: {
          ...dashboard.filters,
          granularity,
        },
      });
  }

  function setChecks(checks) {
    dashboard &&
      updateDashboard({
        filters: {
          ...dashboard.filters,
          checks: serializeLogic(checks),
        },
      });
  }

  function getChartComponent(id: string) {
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
  }

  async function onToggleMode() {
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
  }

  function toggleChart(chartID: string) {
    let newState = [...tempChartsState];
    if (tempChartsState.includes(chartID)) {
      newState = newState.filter((id) => id !== chartID);
    } else {
      newState.push(chartID);
    }
    setTempChartsState(newState);
  }

  async function createDashboard(name: string) {
    if (!name) {
      throw new Error("Dashboard name is required");
    }

    const entry = await insertDashboard({
      name,
      filters: {
        checks: serializedChecks,
        dateRange: [startDate.toISOString(), endDate.toISOString()],
      },
      charts: tempChartsState,
    });
    setDashboardID(entry.id);

    onToggleMode();
  }

  function handleDropChart(item: { id: string }, chartID) {
    const newState = [...tempChartsState];

    let itemIndex = newState.indexOf(item.id);
    let index = newState.indexOf(chartID);

    newState.splice(itemIndex, 1);
    newState.splice(index, 0, item.id);

    setTempChartsState(newState);
  }

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
          router.push("/dashboards");
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
          <Stack
            style={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              backgroundColor: "var(--mantine-color-body)",
              paddingTop: 20,
              paddingBottom: 10,
            }}
          >
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
                {dashboard &&
                  (pinnedDashboard === dashboard.id ? (
                    <ActionIcon
                      variant="outline"
                      color="red"
                      onClick={() => setPinnedDashboard("")}
                    >
                      <IconPinned size={12} />
                    </ActionIcon>
                  ) : (
                    <ActionIcon
                      variant="outline"
                      onClick={() => setPinnedDashboard(dashboard.id)}
                    >
                      <IconPin size={12} />
                    </ActionIcon>
                  ))}

                <Button
                  variant="filled"
                  onClick={() => {
                    !editMode && onToggleMode();
                    openChartSelector();
                  }}
                  leftSection={<IconPlus size={12} />}
                  size="xs"
                >
                  Add
                </Button>

                <Button
                  variant="outline"
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
                    variant="gradient"
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
                      closeChartSelector();
                      setTempChartsState(dashboard?.charts || DEFAULT_CHARTS);
                      setEditMode(false);
                    }}
                    size="sm"
                  >
                    <IconCancel size={12} />
                  </ActionIcon>
                )}
              </Group>

              <Menu position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle">
                    <IconDotsVertical size={12} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconStackPop size={16} />}
                    onClick={() => openSaveAs()}
                  >
                    Duplicate
                  </Menu.Item>
                  {dashboard && (
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => removeDashboard()}
                    >
                      Delete
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
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

            {dashboard && (
              <Group gap="xs">
                <IconTimeline size={16} />
                {editMode ? (
                  <RenamableField
                    defaultValue={dashboard.name}
                    onRename={(newName) => {
                      updateDashboard({
                        name: newName,
                      });
                    }}
                  />
                ) : (
                  <Title order={3}>{dashboard.name}</Title>
                )}
              </Group>
            )}
          </Stack>

          <Grid>
            {chartsState.slice(0, 3).map((chartID) => (
              <Grid.Col span={4} key={chartID}>
                <Droppable
                  onDrop={(item) => handleDropChart(item, chartID)}
                  editMode={editMode}
                >
                  <Draggable id={chartID} editMode={editMode}>
                    {getChartComponent(chartID)}
                  </Draggable>
                </Droppable>
              </Grid.Col>
            ))}

            <Grid.Col span={12}>
              <Droppable
                onDrop={(item) => handleDropChart(item, chartsState[3])}
                editMode={editMode}
              >
                <Draggable id={chartsState[3]} editMode={editMode}>
                  {getChartComponent(chartsState[3])}
                </Draggable>
              </Droppable>
            </Grid.Col>

            {chartsState.slice(4).map((chartID) => (
              <Grid.Col span={6}>
                <Droppable
                  key={chartID}
                  onDrop={(item) => handleDropChart(item, chartID)}
                  editMode={editMode}
                >
                  <Draggable id={chartID} editMode={editMode}>
                    {getChartComponent(chartID)}
                  </Draggable>
                </Droppable>
              </Grid.Col>
            ))}

            <Grid.Col span="auto">
              {editMode && (
                <Card
                  p="md"
                  h="100%"
                  withBorder
                  radius="md"
                  style={{
                    border: "2px dashed #ccc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={openChartSelector}
                >
                  <Button
                    size="lg"
                    variant="transparent"
                    leftSection={<IconPlus size={15} />}
                  >
                    Add
                  </Button>
                </Card>
              )}
            </Grid.Col>
          </Grid>
        </Stack>
      </DndProvider>
    </Empty>
  );
}
