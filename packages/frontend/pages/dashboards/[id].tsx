import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import ChartComponent from "@/components/analytics/Charts/ChartComponent";
import DashboardModal from "@/components/analytics/DashboardModal";
import DateRangeGranularityPicker, {
  useDateRangeGranularity,
} from "@/components/analytics/DateRangeGranularityPicker";
import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import RenamableField from "@/components/blocks/RenamableField";
import CheckPicker from "@/components/checks/Picker";
import {
  useCustomCharts,
  useDashboard,
  useDashboards,
} from "@/utils/dataHooks/dashboards";
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  Loader,
  Menu,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDotsVertical,
  IconHome2,
  IconPlus,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Chart, DEFAULT_CHARTS, LogicNode } from "shared";

function getSpan(index: number) {
  if ([0, 1, 2].includes(index)) {
    return 4;
  }

  if (index === 3) {
    return 12;
  }

  return 6;
}

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

  const { insert: insertDashboard, dashboards } = useDashboards();
  const { customCharts } = useCustomCharts();

  const [checks, setChecks] = useState<LogicNode>(["AND"]);
  const [charts, setCharts] = useState<Chart[]>([]);

  const { startDate, endDate, setDateRange, granularity, setGranularity } =
    useDateRangeGranularity();

  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const [isEditing, setIsEditing] = useState(false);

  function setChartsWithSortOrder(newCharts: Chart[]) {
    const orderedCharts = newCharts.map((c, i) => ({ ...c, sortOrder: i }));
    setCharts(orderedCharts);
  }

  // useEffect(() => {
  //   if (router.query.id !== dashboardId) {
  //     router.push("/");
  //   }
  // }, [router.query.id, dashboardId]);

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

  const isDirty = useMemo(() => {
    if (!dashboard) return false;
    const current = {
      checks,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
      charts,
    };
    const initial = {
      checks: dashboard.checks,
      startDate: dashboard.startDate,
      endDate: dashboard.endDate,
      granularity: dashboard.granularity,
      charts: dashboard.charts,
    };
    return JSON.stringify(current) !== JSON.stringify(initial);
  }, [dashboard, checks, startDate, endDate, granularity, charts]);

  if (dashboardIsLoading || !dashboard) {
    return (
      <Flex align="center" justify="center" h="280px">
        <Loader />
      </Flex>
    );
  }

  function saveDashboard() {
    updateDashboard({
      checks,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
      charts,
    });
  }

  function handleDrop(dragIndex: number, dropIndex: number) {
    const newCharts = structuredClone(charts);
    [newCharts[dragIndex], newCharts[dropIndex]] = [
      newCharts[dropIndex],
      newCharts[dragIndex],
    ];
    setChartsWithSortOrder(newCharts);
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
        const newChart: Chart = {
          id,
          name: base.name,
          description: base.description,
          type: base.type,
          dataKey: base.dataKey,
          aggregationMethod: base.aggregationMethod || null,
          primaryDimension: base.primaryDimension || null,
          secondaryDimension: base.secondaryDimension || null,
          isCustom: false,
        };
        finalCharts.push(newChart);
      } else {
        const customChart = customCharts.find((cc) => cc.id === id);
        if (customChart && !existingIds.has(customChart.id)) {
          const newChart: Chart = {
            id: customChart.id,
            name: customChart.name,
            description: customChart.description,
            type: customChart.type,
            dataKey: customChart.dataKey,
            aggregationMethod: customChart.aggregationMethod,
            primaryDimension: customChart.primaryDimension,
            secondaryDimension: customChart.secondaryDimension,
            isCustom: true,
            customChartId: customChart.id,
            color: customChart.color,
            startDate: customChart.startDate,
            endDate: customChart.endDate,
            granularity: customChart.granularity,
            checks: customChart.checks,
          };
          finalCharts.push(newChart);
        }
      }
    }

    setChartsWithSortOrder(finalCharts);
    closeModal();
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
      <Stack pt="24px">
        <Stack>
          <Group justify="space-between">
            <Group>
              <Group gap="xs">
                {dashboard.isHome && <IconHome2 stroke="2px" size={22} />}
                <RenamableField
                  defaultValue={dashboard.name}
                  onRename={(newName) => updateDashboard({ name: newName })}
                />

                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle">
                      <IconDotsVertical size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconHome2 size={16} />}
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
                      }}
                    >
                      Delete
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconPlus size={16} />}
                      onClick={async () => {
                        const newDashboard = await insertDashboard();
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
                onClick={() => setIsEditing(!isEditing)}
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
              <CheckPicker
                minimal={true}
                value={checks}
                onChange={setChecks}
                restrictTo={(filter) =>
                  ["models", "tags", "users", "metadata"].includes(filter.id)
                }
              />
            </Group>
          </Group>
        </Stack>

        <Box
          ref={scrollableContainerRef}
          style={{ maxHeight: "calc(100vh - 110px)", overflowY: "auto" }}
        >
          <Grid>
            {charts.map((chart, index) => (
              <Grid.Col span={getSpan(index)} key={chart.id} h="350px">
                <ErrorBoundary>
                  <Droppable
                    index={index}
                    onDrop={handleDrop}
                    scrollContainerRef={scrollableContainerRef}
                  >
                    <Draggable index={index} isEditing={isEditing}>
                      <AnalyticsCard
                        title={chart.name}
                        description={chart.description}
                        isEditing={isEditing}
                        onDelete={() => handleRemoveChart(index)}
                      >
                        <ChartComponent
                          id={chart.id}
                          dataKey={chart.dataKey}
                          startDate={new Date(chart.startDate || startDate)}
                          endDate={new Date(chart.endDate || endDate)}
                          granularity={chart.granularity || granularity}
                          checks={[
                            ...(Array.isArray(chart.checks)
                              ? chart.checks
                              : []),
                            ...checks,
                          ]}
                          color={chart.color}
                          aggregationMethod={chart.aggregationMethod}
                          isCustom={chart.isCustom}
                          primaryDimension={chart.primaryDimension}
                          secondaryDimension={chart.secondaryDimension}
                          chart={chart}
                        />
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
      ref={drag}
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
  scrollContainerRef: React.RefObject<HTMLDivElement>;
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
    <div ref={drop} style={{ height: "100%", opacity: isOver ? 0.4 : 1 }}>
      {children}
    </div>
  );
}
