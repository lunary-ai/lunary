import TopModels from "@/components/analytics/Charts/TopModels";
import LineChart from "@/components/analytics/OldLineChart";
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
  Alert,
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
  Title,
  useComputedColorScheme,
} from "@mantine/core";

import { useInViewport } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCancel,
  IconChartAreaLine,
  IconChartLine,
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconFilter,
  IconPlus,
  IconStackPop,
  IconTimeline,
  IconTrash,
} from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { useEffect, useMemo, useState } from "react";
import { deserializeLogic, serializeLogic } from "shared";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import Sentiment from "@/components/analytics/Charts/Sentiment";
import { useDashboard, useDashboards } from "@/utils/dataHooks/dashboards";
import { useDisclosure } from "@mantine/hooks";

import { useCharts } from "@/utils/dataHooks/charts";

import {
  CustomChart,
  CustomChartCreator,
  DateRangePicker,
  determineGranularity,
  Granularity,
  GranularitySelect,
  SelectableCustomChart,
} from "@/components/analytics/Creator";
import { ConfirmModal, SaveAsModal } from "@/components/analytics/Modals";
import PieChart from "@/components/analytics/PieChart";
import { Draggable, Droppable } from "@/components/analytics/Wrappers";
import RenamableField from "@/components/blocks/RenamableField";
import { ALL_CHARTS, deserializeDateRange } from "@/utils/analytics";

import { useRouter } from "next/router";

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
  chartType,
  ...extraProps
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
  chartType: "line" | "pie";
}) {
  const { ref, inViewport } = useInViewport();
  const [load, setLoad] = useState(inViewport);

  const { data, isLoading } = useAnalyticsChartData<any>(
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
      {chartType === "pie" ? (
        <PieChart
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
          extraProps={extraProps}
        />
      ) : (
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
          extraProps={extraProps}
        />
      )}
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
  const [page, setPage] = useState("insights");
  const [activeTab, setActiveTab] = useState("default");
  const [creatorConfig, setCreatorConfig] = useState();
  const { insert: insertChart, charts } = useCharts<any>();

  return (
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
          height: "75vh",
          flexDirection: "column",
        },
      }}
    >
      {page === "insights" ? (
        <>
          <Button
            variant="outline"
            leftSection={<IconPlus />}
            style={{
              position: "absolute",
              right: "15%",
              zIndex: 100,
            }}
            onClick={() => setPage("creator")}
          >
            Create Insight
          </Button>
          <Tabs variant="outline" value={activeTab}>
            <Tabs.List>
              <Tabs.Tab
                value="default"
                leftSection={<IconChartLine />}
                onClick={() => setActiveTab("default")}
              >
                Default Insights
              </Tabs.Tab>
              <Tabs.Tab
                value="custom"
                leftSection={<IconChartAreaLine />}
                onClick={() => setActiveTab("custom")}
              >
                Custom Insights
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel
              value="default"
              p="md"
              style={{ overflowY: "scroll", maxHeight: "75vh" }}
            >
              <Stack style={{ overflowY: "auto" }}>
                <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                  {ALL_CHARTS.main.map((chartID) =>
                    getChartComponent(chartID, {
                      selectable: true,
                      isSelected: chartsState.includes(chartID),
                      onSelect() {
                        toggleChart(chartID);
                      },
                    }),
                  )}
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                  {ALL_CHARTS.extras.map((chartID) =>
                    getChartComponent(chartID, {
                      selectable: true,
                      isSelected: chartsState.includes(chartID),
                      onSelect() {
                        toggleChart(chartID);
                      },
                    }),
                  )}
                </SimpleGrid>
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="custom" p="md">
              <Stack style={{ overflowY: "auto" }}>
                {charts?.length ? (
                  <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                    {charts.map((chart, index) => (
                      <SelectableCustomChart
                        index={index}
                        chart={chart}
                        key={index}
                        edit={(item) => {
                          setPage("creator");
                          setCreatorConfig(item);
                        }}
                        chartsState={chartsState}
                        toggleChart={toggleChart}
                      />
                    ))}
                  </SimpleGrid>
                ) : (
                  <Alert
                    icon={<IconAlertTriangle size={16} />}
                    title="No Custom Insights"
                    color="red"
                  >
                    Create one using the button above
                  </Alert>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </>
      ) : (
        <>
          <Group
            justify="start"
            p="sm"
            m="xl"
            style={{
              borderBottom: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Button
              variant="default"
              onClick={() => setPage("insights")}
              leftSection={<IconArrowLeft size={16} />}
            >
              Back
            </Button>
          </Group>
          <CustomChartCreator
            config={creatorConfig}
            onConfirm={({ name, config }) => {
              return insertChart({ name, type: config.name, config }).then(
                () => {
                  setPage("insights");
                  setActiveTab("custom");
                },
              );
            }}
          />
        </>
      )}
    </Modal>
  );
}

// TODO: typescript everywhere
export default function Analytics() {
  const router = useRouter();
  const dashboardId = router.query?.id as string;

  const {
    dashboard,
    update: updateDashboard,
    remove: removeDashboardFn,
    isLoading: dashboardLoading,
  } = useDashboard(dashboardId);

  const [editMode, setEditMode] = useState(false);
  const [
    chartSelectedOpened,
    { open: openChartSelector, close: closeChartSelector },
  ] = useDisclosure(false);
  const [saveAsOpened, { open: openSaveAs, close: closeSaveAs }] =
    useDisclosure(false);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);

  const colorScheme = useComputedColorScheme();
  const { insert: insertDashboard } = useDashboards();

  useEffect(() => {
    setTempDashboardState(dashboard);
  }, [dashboard, dashboardLoading]);

  // Temporary state used in edit mode
  const [tempDashboardState, setTempDashboardState] = useState(dashboard);

  const dashboardState = useMemo(() => {
    // if (editMode) return tempDashboardState;
    return dashboard;
  }, [editMode, dashboard, tempDashboardState]);

  const { dateRange, granularity, checks } = useMemo(() => {
    const dateRange = deserializeDateRange(dashboardState?.filters.dateRange);

    return {
      dateRange,
      granularity: determineGranularity(dateRange),
      checks: deserializeLogic(dashboardState?.filters.checks || "", true),
    };
  }, [dashboardState]);

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
    "top/languages": {
      chartType: "pie",
      dataKey: "top/languages",
      props: ["isoCode", "count"],
      title: "Languages",
      description: "Top languages for your runs",
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
      description: "The average duration of your LLM Calls",
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

  function removeDashboard() {
    removeDashboardFn();
    router.push("/dashboards");
  }

  function setDateRange(dateRange) {
    updateDashboard({
      filters: {
        ...dashboardState.filters,
        dateRange: [dateRange[0].toISOString(), dateRange[1].toISOString()],
      },
    });
  }

  function setGranularity(granularity) {
    updateDashboard({
      filters: {
        ...dashboardState.filters,
        granularity,
      },
    });
  }

  function setChecks(checks) {
    updateDashboard({
      filters: {
        ...dashboardState.filters,
        checks: serializeLogic(checks),
      },
    });
  }

  function getChartComponent(id: string, props?: any) {
    if (id === "models") {
      return (
        <TopModels
          data={topModels}
          isLoading={topModelsLoading}
          {...(props || {})}
        />
      );
    }
    if (id === "templates") {
      return (
        <TopTemplates
          {...(props || {})}
          topTemplates={topTemplates}
          isLoading={topTemplatesLoading}
        />
      );
    }
    if (id === "users") {
      return (
        <TopUsersCard
          topUsers={topUsers}
          isLoading={topUsersLoading}
          {...(props || {})}
        />
      );
    }
    if (id === "sentiments") {
      return <Sentiment />;
    }
    if (chartProps[id]) {
      return (
        <AnalyticsChart
          {...chartProps[id]}
          {...commonChartData}
          {...(props || {})}
        />
      );
    }
    return <CustomChart chartID={id} {...commonChartData} {...(props || {})} />;
  }

  async function onToggleMode() {
    if (editMode) {
      // Exiting edit mode

      if (dashboard) {
        await updateDashboard(tempDashboardState);
      } else {
        return openSaveAs();
      }
    } else {
      setTempDashboardState(dashboard);
    }

    setEditMode(!editMode);
  }

  function toggleChart(chartID: string) {
    let newState = { ...tempDashboardState };
    if (tempDashboardState.charts.includes(chartID)) {
      newState.charts = newState.charts.filter((id) => id !== chartID);
    } else {
      newState.charts.push(chartID);
    }
    setTempDashboardState(newState);
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
      charts: tempDashboardState.charts,
    });
    router.push(`/dashboards/${entry.id}`);

    onToggleMode();
  }

  function handleDropChart(item: { id: string }, chartID) {
    const newState = { ...tempDashboardState };

    let itemIndex = newState.charts.indexOf(item.id);
    let index = newState.charts.indexOf(chartID);

    newState.charts.splice(itemIndex, 1);
    newState.charts.splice(index, 0, item.id);

    setTempDashboardState(newState);
  }

  return (
    <Empty
      showProjectId
      Icon={IconChartAreaLine}
      title="Waiting for data..."
      description="Analytics will appear here once you have some data."
      enable={project && !project?.activated}
    >
      <style>
        {`.header, .sidebar {
          opacity: ${editMode ? 0.6 : 1};
        }`}
      </style>
      <NextSeo title="Analytics" />

      <ChartSelector
        opened={chartSelectedOpened}
        toggleChart={toggleChart}
        close={closeChartSelector}
        chartsState={dashboardState?.charts || []}
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
        }}
        title={`Delete dashboard "${dashboard?.name}"`}
      />

      <DndProvider backend={HTML5Backend}>
        <Stack gap="lg" className="charts">
          <Stack
            top="0"
            pos="sticky"
            pt="20"
            pb="10"
            bg={"var(--mantine-color-body)"}
            style={{
              zIndex: 1,
              borderBottom:
                "2px solid " +
                (colorScheme === "dark"
                  ? "var(--mantine-color-dark-4)"
                  : "var(--mantine-color-gray-3)"),
            }}
            className="header"
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

                {editMode && (
                  <ActionIcon
                    color="red"
                    variant="outline"
                    onClick={() => {
                      closeChartSelector();
                      setTempDashboardState(dashboard);
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
                      onClick={() => openConfirm()}
                    >
                      Delete
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            </Group>

            <Group>
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

              {showBar && (
                <Group ml="lg">
                  <CheckPicker
                    minimal
                    onChange={setChecks}
                    defaultOpened={showCheckBar}
                    value={checks}
                    restrictTo={(filter) =>
                      ["tags", "models", "users", "metadata"].includes(
                        filter.id,
                      )
                    }
                  />
                </Group>
              )}
            </Group>
          </Stack>

          <Grid>
            {dashboardState?.charts.slice(0, 3).map((chartID) => (
              <Grid.Col className="chart" span={4} key={chartID}>
                <Droppable
                  onDrop={(item) => handleDropChart(item, chartID)}
                  editMode={editMode}
                >
                  <Draggable id={chartID} editMode={editMode}>
                    {getChartComponent(chartID, {
                      selectable: editMode,
                      isSelected: tempDashboardState?.charts.includes(chartID),
                      onSelect: () => toggleChart(chartID),
                    })}
                  </Draggable>
                </Droppable>
              </Grid.Col>
            ))}

            <Grid.Col className="chart" span={12}>
              <Droppable
                onDrop={(item) =>
                  handleDropChart(item, dashboardState?.charts[3])
                }
                editMode={editMode}
              >
                <Draggable id={dashboardState?.charts[3]} editMode={editMode}>
                  {getChartComponent(dashboardState?.charts[3], {
                    selectable: editMode,
                    isSelected: tempDashboardState?.charts.includes(
                      dashboardState?.charts[3],
                    ),
                    onSelect: () => toggleChart(dashboardState?.charts[3]),
                  })}
                </Draggable>
              </Droppable>
            </Grid.Col>

            <Grid.Col className="chart" span={6}>
              <Droppable
                key={"top/languages"}
                onDrop={(item) => handleDropChart(item, "top/languages")}
                editMode={editMode}
              >
                <Draggable id={"top/languages"} editMode={editMode}>
                  {getChartComponent("top/languages", {
                    selectable: editMode,
                    isSelected:
                      tempDashboardState?.charts.includes("top/languages"),
                    onSelect: () => toggleChart("top/languages"),
                  })}
                </Draggable>
              </Droppable>
            </Grid.Col>

            {dashboardState?.charts.slice(4).map((chartID) => (
              <Grid.Col className="chart" span={6}>
                <Droppable
                  key={chartID}
                  onDrop={(item) => handleDropChart(item, chartID)}
                  editMode={editMode}
                >
                  <Draggable id={chartID} editMode={editMode}>
                    {getChartComponent(chartID, {
                      selectable: editMode,
                      isSelected: tempDashboardState?.charts.includes(chartID),
                      onSelect: () => toggleChart(chartID),
                    })}
                  </Draggable>
                </Droppable>
              </Grid.Col>
            ))}

            <Grid.Col className="chart" span="auto">
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
