import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import ChartComponent from "@/components/analytics/Charts/ChartComponent";
import DashboardModal from "@/components/analytics/DashboardModal";
import DateRangeGranularityPicker, {
  useDateRangeGranularity,
} from "@/components/analytics/DateRangeGranularityPicker";
import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import RenamableField from "@/components/blocks/RenamableField";
import AiFilterSkeleton from "@/components/checks/ai-filter-skeleton";
import CheckPicker from "@/components/checks/Picker";
import { DASHBOARD_AI_FILTER_EXAMPLES } from "@/utils/ai-filters";
import {
  useCustomCharts,
  useDashboard,
  useDashboards,
} from "@/utils/dataHooks/dashboards";
import { useAiFilter } from "@/utils/useAiFilter";
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  Loader,
  Menu,
  Select,
  SegmentedControl,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDotsVertical,
  IconPinnedFilled,
  IconPlus,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import deepEqual from "fast-deep-equal";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Chart, DEFAULT_CHARTS, LogicNode } from "shared";

function serialiseDashboardState({
  checks,
  startDate,
  endDate,
  granularity,
  charts,
}: {
  checks: LogicNode;
  startDate: Date | string;
  endDate: Date | string;
  granularity: string | null;
  charts: ChartWithSpan[] | undefined;
}) {
  return {
    checks,
    start: new Date(startDate).toISOString(),
    end: new Date(endDate).toISOString(),
    granularity,
    charts: (charts ?? [])
      .map(({ id, span, sortOrder, ...rest }) => ({
        id,
        span: span ?? null,
        sortOrder: sortOrder ?? null,
        ...rest,
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  };
}

function getSpan(index: number) {
  return index < 3 ? 4 : 6;
}

type ChartWithSpan = Chart & {
  span?: number;
  sortOrder?: number;
  startDate?: string;
  endDate?: string;
  granularity?: string;
  checks?: LogicNode;
};

export default function Dashboard() {
  const router = useRouter();
  const dashboardId = router.query.id as string;

  const {
    dashboard,
    update: updateDashboard,
    isLoading: dashboardIsLoading,
    remove: removeDashboard,
    isMutating: dashboardIsMutating,
  } = useDashboard(dashboardId);

  const { insert: insertDashboard, dashboards, mutate } = useDashboards();
  const { customCharts } = useCustomCharts();

  const [checks, setChecks] = useState<LogicNode>(["AND"]);
  const [charts, setCharts] = useState<ChartWithSpan[]>([]);
  const { applyAiFilter, isAiFilterLoading } = useAiFilter();

  const { startDate, endDate, setDateRange, granularity, setGranularity } =
    useDateRangeGranularity();
  const globalAiLoading = isAiFilterLoading("dashboard-global");

  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const [isEditing, setIsEditing] = useState(false);
  const [filterIndex, setFilterIndex] = useState<number | null>(null);

  function setChartsWithSortOrder(newCharts: ChartWithSpan[]) {
    const orderedCharts = newCharts.map((c, i) => {
      const defaultSpan = getSpan(i);
      // first row always one-third; other rows default to half unless manually expanded (span===12)
      const span = i < 3 ? defaultSpan : c.span === 12 ? 12 : defaultSpan;
      return { ...c, sortOrder: i, span };
    });
    setCharts(orderedCharts);
  }

  async function handleAiFilterSubmit(request: string) {
    const trimmed = request.trim();
    if (!trimmed) {
      return;
    }

    await applyAiFilter(trimmed, {
      key: "dashboard-global",
      notifyOnError: false,
      onSuccess: ({ logic }) => {
        setChecks(logic);
      },
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't convert your request. Try rephrasing it.";
        notifications.show({
          title: "AI filter failed",
          message,
          color: "red",
        });
      },
    }).catch(() => {});
  }

  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dashboardIsLoading && dashboard) {
      setChecks(dashboard.checks);
      setChartsWithSortOrder(dashboard.charts || []);

      if (dashboard.startDate && dashboard.endDate) {
        setDateRange([
          new Date(dashboard.startDate),
          new Date(dashboard.endDate),
        ]);
      }

      if (dashboard.granularity) {
        setGranularity(dashboard.granularity);
      }
    }
  }, [dashboard, dashboardIsLoading]);

  const baselineRef = useRef<ReturnType<typeof serialiseDashboardState> | null>(
    null,
  );

  useEffect(() => {
    if (!dashboardIsLoading && dashboard) {
      const orderedCharts = (dashboard.charts ?? []).map((c, i) => ({
        ...c,
        sortOrder: i,
        span: getSpan(i),
      }));

      setCharts(orderedCharts); // ① set state
      setChecks(dashboard.checks);

      if (dashboard.startDate && dashboard.endDate) {
        setDateRange([
          new Date(dashboard.startDate),
          new Date(dashboard.endDate),
        ]);
      }
      if (dashboard.granularity) setGranularity(dashboard.granularity);

      baselineRef.current = serialiseDashboardState({
        checks: dashboard.checks,
        startDate: dashboard.startDate ?? startDate,
        endDate: dashboard.endDate ?? endDate,
        granularity: dashboard.granularity,
        charts: orderedCharts,
      });
    }
  }, [dashboardIsLoading, dashboard]);

  const isDirty = useMemo(() => {
    if (!baselineRef.current) return false;
    return !deepEqual(
      baselineRef.current,
      serialiseDashboardState({
        checks,
        startDate,
        endDate,
        granularity,
        charts,
      }),
    );
  }, [checks, startDate, endDate, granularity, charts]);

  async function saveDashboard() {
    const payload = {
      checks,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
      charts,
    };

    await updateDashboard(payload);
    baselineRef.current = serialiseDashboardState(payload); // reset baseline
  }

  function handleRemoveChart(index: number) {
    const newCharts = charts.filter((_, i) => i !== index);
    setChartsWithSortOrder(newCharts);
  }

  function handleApply(selectedChartIds: string[]) {
    const existingIds = new Set(charts.map((c) => c.id));
    const finalCharts = [...charts];

    for (const id of selectedChartIds) {
      const base = DEFAULT_CHARTS[id];
      if (base && !existingIds.has(id)) {
        const newChart = {
          id,
          name: base.name,
          description: base.description,
          type: base.type,
          dataKey: base.dataKey,
          aggregationMethod: base.aggregationMethod || null,
          primaryDimension: null,
          secondaryDimension: null,
          isCustom: false,
        } as ChartWithSpan;
        finalCharts.push(newChart);
      } else {
        const customChart = customCharts.find((cc) => cc.id === id);
        if (customChart && !existingIds.has(customChart.id)) {
          const newChart = {
            id: customChart.id,
            name: customChart.name,
            description: customChart.description,
            type: customChart.type,
            dataKey: customChart.dataKey,
            aggregationMethod: customChart.aggregationMethod,
            primaryDimension: customChart.primaryDimension,
            secondaryDimension: customChart.secondaryDimension,
            isCustom: true,
            color: customChart.color,
            // optional timeline and filter properties omitted for custom charts
          } as ChartWithSpan;
          finalCharts.push(newChart);
        }
      }
    }

    setChartsWithSortOrder(finalCharts);
    closeModal();
  }

  function handleResize(index: number) {
    // first row always one-third, skip resize for indices 0-2
    if (index < 3) {
      return;
    }
    const spans = [6, 12];
    const newCharts = structuredClone(charts);
    const current = newCharts[index].span ?? getSpan(index);
    const next = spans[(spans.indexOf(current as number) + 1) % spans.length];
    newCharts[index].span = next;
    setChartsWithSortOrder(newCharts);
  }

  // Handle chart-level filter changes
  function handleChartChecksChange(index: number, newChecks: LogicNode) {
    const newCharts = structuredClone(charts);
    newCharts[index].checks = newChecks;
    setChartsWithSortOrder(newCharts);
  }

  async function handleChartAiFilter(index: number, request: string) {
    const trimmed = request.trim();
    if (!trimmed) {
      return;
    }

    await applyAiFilter(trimmed, {
      key: `chart-${index}`,
      notifyOnError: false,
      onSuccess: ({ logic }) => {
        handleChartChecksChange(index, logic);
      },
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't convert your request. Try rephrasing it.";
        notifications.show({
          title: "AI filter failed",
          message,
          color: "red",
        });
      },
    }).catch(() => {});
  }

  // add handlers for editing chart name and description
  function handleChartRename(index: number, newName: string) {
    const newCharts = structuredClone(charts);
    newCharts[index].name = newName;
    setChartsWithSortOrder(newCharts);
  }

  function handleChartDescriptionChange(index: number, newDescription: string) {
    const newCharts = structuredClone(charts);
    newCharts[index].description = newDescription;
    setChartsWithSortOrder(newCharts);
  }

  function handleChartTypeChange(index: number, newType: string) {
    const newCharts = structuredClone(charts);
    newCharts[index].type = newType;
    setChartsWithSortOrder(newCharts);
  }

  function handleChartSplitByChange(index: number, splitBy: string) {
    const newCharts = structuredClone(charts);
    newCharts[index].primaryDimension = splitBy;
    setChartsWithSortOrder(newCharts);
  }

  function handleFilter(index: number) {
    setFilterIndex((prev) => (prev === index ? null : index));
  }

  // Handle drag-and-drop reordering
  function handleDrop(dragIndex: number, dropIndex: number) {
    const newCharts = structuredClone(charts);
    const [moved] = newCharts.splice(dragIndex, 1);
    newCharts.splice(dropIndex, 0, moved);
    setChartsWithSortOrder(newCharts);
  }

  if (dashboardIsLoading || !dashboard) {
    return (
      <Flex align="center" justify="center" h="280px">
        <Loader />
      </Flex>
    );
  }

  return (
    <>
      {modalOpened && (
        <DashboardModal
          opened={modalOpened}
          close={closeModal}
          startDate={startDate}
          endDate={endDate}
          granularity={granularity}
          checks={checks}
          onApply={handleApply}
          dashboardStartDate={startDate}
          dashboardEndDate={endDate}
          dashboardGranularity={granularity}
        />
      )}
      <Stack>
        <Stack>
          <Group justify="space-between">
            <Group>
              <Group gap="xs">
                <RenamableField
                  order={4}
                  defaultValue={dashboard.name}
                  onRename={(newName) => updateDashboard({ name: newName })}
                  hidePencil={true}
                />

                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle">
                      <IconDotsVertical size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconPinnedFilled size={16} />}
                      disabled={dashboard.isHome}
                      onClick={() => updateDashboard({ isHome: true })}
                    >
                      Set as Home Dashboard
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => {
                        if (dashboard.isHome) {
                          alert("Cannot delete Home Dashboard");
                          return;
                        }
                        removeDashboard();
                        router.push(`/dashboards`);
                      }}
                    >
                      Delete
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconPlus size={16} />}
                      onClick={async () => {
                        const newDashboard = await insertDashboard();
                        await mutate();
                        router.push(`/dashboards/${newDashboard.id}`);
                      }}
                    >
                      Create new Dashboard
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
            <Group>
              <Button
                onClick={openModal}
                variant="default"
                leftSection={<IconPlus size={14} />}
              >
                Add Charts
              </Button>

              <Button
                variant={isEditing ? "filled" : "default"}
                leftSection={isEditing ? null : <IconSettings size="18px" />}
                onClick={() => {
                  if (isEditing) setFilterIndex(null);
                  setIsEditing(!isEditing);
                }}
              >
                {isEditing ? "Done" : "Edit"}
              </Button>
              <Button
                onClick={saveDashboard}
                leftSection={dashboardIsMutating ? <Loader size="sm" /> : null}
                disabled={!isDirty || isEditing}
              >
                Save
              </Button>
            </Group>
          </Group>
          <Group justify="space-between">
            <Group>
              <DateRangeGranularityPicker
                dateRange={[startDate, endDate]}
                setDateRange={setDateRange}
                granularity={granularity}
                setGranularity={setGranularity}
              />
              {globalAiLoading ? (
                <AiFilterSkeleton wrap="wrap" px="sm" />
              ) : (
                <CheckPicker
                  minimal={true}
                  value={checks}
                  onChange={setChecks}
                  restrictTo={(filter) =>
                    [
                      "models",
                      "tags",
                      "users",
                      "type",
                      "metadata",
                      "status",
                      "metadata",
                      "feedback",
                      "cost",
                      "duration",
                      "template",
                    ].includes(filter.id)
                  }
                  aiFilter={{
                    onSubmit: handleAiFilterSubmit,
                    loading: globalAiLoading,
                    examples: DASHBOARD_AI_FILTER_EXAMPLES,
                  }}
                />
              )}
            </Group>
          </Group>
        </Stack>

        <Box
          ref={scrollableContainerRef}
          style={{
            maxHeight: "calc(100vh - 150px)",
            overflowY: "auto",
            overflowX: "hidden",
            zIndex: 5,
            width: "100%",
          }}
        >
          <Grid>
            {charts.map((chart, index) => (
              <Grid.Col span={chart.span} key={chart.id} h="350px">
                <ErrorBoundary>
                  <Droppable
                    index={index}
                    onDrop={handleDrop}
                    scrollContainerRef={
                      scrollableContainerRef as React.RefObject<HTMLDivElement | null>
                    }
                  >
                    <Draggable index={index} isEditing={isEditing}>
                      <AnalyticsCard
                        title={chart.name}
                        description={chart.description}
                        isEditing={isEditing}
                        // only allow resize on rows beyond first with dynamic tooltip
                        {...(isEditing && index >= 3
                          ? {
                              onResize: () => handleResize(index),
                              resizeLabel:
                                chart.span === 6
                                  ? "Expand to full width"
                                  : "Shrink to half width",
                            }
                          : {})}
                        onDelete={() => handleRemoveChart(index)}
                        filterCount={
                          Array.isArray(chart.checks)
                            ? chart.checks.length > 1
                              ? chart.checks.length - 1
                              : 0
                            : 0
                        }
                        onFilter={
                          isEditing ? () => handleFilter(index) : undefined
                        }
                        filterLabel="Edit Chart"
                      >
                        {filterIndex === index ? (
                          <Box style={{ padding: "1rem", overflow: "scroll" }}>
                            <TextInput
                              label="Name"
                              value={chart.name ?? ""}
                              onChange={(e) =>
                                handleChartRename(index, e.currentTarget.value)
                              }
                              mb="md"
                            />
                            <TextInput
                              label="Description"
                              value={chart.description ?? ""}
                              onChange={(e) =>
                                handleChartDescriptionChange(
                                  index,
                                  e.currentTarget.value,
                                )
                              }
                              mb="md"
                            />
                            {(chart.dataKey === "run-types" ||
                              chart.type !== "Top") && (
                              <>
                                <Title order={5} mb="xs">
                                  Chart Type
                                </Title>
                                <SegmentedControl
                                  fullWidth
                                  value={chart.type}
                                  onChange={(value) =>
                                    handleChartTypeChange(index, value)
                                  }
                                  data={
                                    chart.dataKey === "run-types"
                                      ? [
                                          { label: "Bar", value: "Bar" },
                                          { label: "Area", value: "Area" },
                                          { label: "Top", value: "Top" },
                                        ]
                                      : [
                                          { label: "Bar", value: "Bar" },
                                          { label: "Area", value: "Area" },
                                        ]
                                  }
                                  mb="md"
                                />
                              </>
                            )}
                            {chart.dataKey === "run-types" && (
                              <>
                                <Title order={5} mb="xs">
                                  Split By
                                </Title>
                                <Select
                                  data={[
                                    { label: "Type", value: "type" },
                                    { label: "Tags", value: "tags" },
                                  ]}
                                  value={chart.primaryDimension || "type"}
                                  onChange={(value) => {
                                    if (value) {
                                      handleChartSplitByChange(index, value);
                                    }
                                  }}
                                  maw={240}
                                  size="sm"
                                  mb="md"
                                />
                              </>
                            )}
                            <Title order={5} mb="xs">
                              Filters
                            </Title>
                            <CheckPicker
                              minimal
                              value={
                                Array.isArray(chart.checks) &&
                                chart.checks.length > 0
                                  ? (chart.checks as LogicNode)
                                  : ["AND"]
                              }
                              onChange={(newChecks) =>
                                handleChartChecksChange(index, newChecks)
                              }
                              restrictTo={(filter) =>
                                [
                                  "models",
                                  "tags",
                                  "users",
                                  "type",
                                  "metadata",
                                  "status",
                                  "feedback",
                                  "cost",
                                  "duration",
                                  "template",
                                ].includes(filter.id)
                              }
                              aiFilter={{
                                onSubmit: (value) =>
                                  handleChartAiFilter(index, value),
                                loading: isAiFilterLoading(`chart-${index}`),
                                examples: DASHBOARD_AI_FILTER_EXAMPLES,
                              }}
                            />
                          </Box>
                        ) : (
                          <ChartComponent
                            id={chart.id}
                            dataKey={chart.dataKey}
                            startDate={new Date(chart.startDate || startDate)}
                            endDate={new Date(chart.endDate || endDate)}
                            granularity={
                              (chart.granularity as typeof granularity) ||
                              granularity
                            }
                            checks={
                              Array.isArray(chart.checks) &&
                              chart.checks.length > 0
                                ? ["OR", chart.checks, checks]
                                : checks
                            }
                            color={chart.color}
                            aggregationMethod={chart.aggregationMethod}
                            isCustom={chart.isCustom}
                            primaryDimension={chart.primaryDimension}
                            secondaryDimension={chart.secondaryDimension}
                            chart={chart}
                          />
                        )}
                      </AnalyticsCard>
                    </Draggable>
                  </Droppable>
                </ErrorBoundary>
              </Grid.Col>
            ))}
          </Grid>
        </Box>
      </Stack>
    </>
  );
}

function Draggable({
  children,
  index,
  isEditing,
}: {
  children: React.ReactNode;
  index: number;
  isEditing: boolean;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "chart",
      item: { index },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
      canDrag: isEditing,
    }),
    [index, isEditing],
  );

  function getCursor() {
    if (!isEditing) {
      return "auto";
    }
    return isDragging ? "grabbing" : "grab";
  }

  return (
    <Box
      ref={drag as any}
      style={{
        height: "100%",
        opacity: isDragging ? 0.5 : 1,
        cursor: getCursor(),
      }}
    >
      {children}
    </Box>
  );
}

function Droppable({
  children,
  onDrop,
  index,
  scrollContainerRef,
}: {
  children: React.ReactNode;
  onDrop: (dragIndex: number, dropIndex: number) => void;
  index: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "chart",
      drop: (item: { index: number }) => onDrop(item.index, index),
      hover: (_, monitor) => {
        if (!scrollContainerRef.current) return;
        const offset = monitor.getClientOffset();
        if (!offset) return;
        const container = scrollContainerRef.current;
        const rect = container.getBoundingClientRect();

        const SCROLL_THRESHOLD = 150;
        const SCROLL_SPEED = 30;

        if (offset.y < rect.top + SCROLL_THRESHOLD) {
          container.scrollTop -= SCROLL_SPEED;
        } else if (offset.y > rect.bottom - SCROLL_THRESHOLD) {
          container.scrollTop += SCROLL_SPEED;
        }
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [onDrop, index, scrollContainerRef],
  );

  return (
    <div
      ref={drop as any}
      style={{ height: "100%", opacity: isOver ? 0.4 : 1 }}
    >
      {children}
    </div>
  );
}
