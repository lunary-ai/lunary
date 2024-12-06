import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import ChartComponent from "@/components/analytics/Charts/ChartComponent";
import chartProps from "@/components/analytics/Charts/chartProps";
import DashboardModal from "@/components/analytics/DashboardModal";
import DateRangeGranularityPicker, {
  useDateRangeGranularity,
} from "@/components/analytics/DateRangeGranularityPicker";
import RenamableField from "@/components/blocks/RenamableField";
import CheckPicker from "@/components/checks/Picker";
import { useDashboard } from "@/utils/dataHooks/dashboards";
import {
  ActionIcon,
  Button,
  Flex,
  Grid,
  Group,
  Loader,
  Menu,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDotsVertical, IconHome2, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import React, { useEffect, useState, useCallback, FC } from "react";
import { Chart, LogicNode } from "shared";
import { DndProvider, useDrag, useDrop, XYCoord } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

function getSpan(index: number) {
  if ([0, 1, 2].includes(index)) {
    return 4;
  }

  if (index === 3) {
    return 12;
  }

  return 6;
}

const ItemTypes = {
  CHART: "chart",
};

interface DraggableChartProps {
  id: string;
  index: number;
  moveChart: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
}

const DraggableChart: FC<DraggableChartProps> = ({
  id,
  index,
  moveChart,
  children,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: ItemTypes.CHART,
    hover(item: { index: number; id: string }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // Only move when the mouse has crossed half of the item height
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Perform the move
      moveChart(dragIndex, hoverIndex);

      // Note: we don't mutate the item here
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CHART,
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
      {children}
    </div>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const dashboardId = router.query.id as string;

  const {
    dashboard,
    update: updateDashboard,
    isLoading: dashboardIsLoading,
    remove: removeDashboard,
  } = useDashboard(dashboardId);

  const [checks, setChecks] = useState<LogicNode>(["AND"]);
  const [charts, setCharts] = useState<Chart[]>([]);

  const { startDate, endDate, setDateRange, granularity, setGranularity } =
    useDateRangeGranularity();

  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  useEffect(() => {
    if (!dashboardIsLoading && dashboard) {
      setChecks(dashboard.checks);
      setCharts(dashboard.chartIds.map((chartId) => chartProps[chartId]));
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

  const moveChart = useCallback((dragIndex: number, hoverIndex: number) => {
    setCharts((prevCharts) => {
      const updated = [...prevCharts];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      return updated;
    });
  }, []);

  function saveDashboard() {
    updateDashboard({
      checks,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
      chartIds: charts.map((chart) => chart.id),
    });
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
      <DashboardModal
        opened={modalOpened}
        close={closeModal}
        startDate={startDate}
        endDate={endDate}
        granularity={granularity}
        checks={checks}
      />
      <Stack pt="24px">
        <Group position="apart">
          <Group>
            <Group spacing="xs">
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
                    icon={<IconHome2 size={16} />}
                    disabled={dashboard.isHome}
                    onClick={() => updateDashboard({ isHome: true })}
                  >
                    Set as Home Dashboard
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    icon={<IconTrash size={16} />}
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
                </Menu.Dropdown>
              </Menu>
            </Group>
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
          <Group>
            <Button onClick={openModal}>Add Chart</Button>
            <Button onClick={saveDashboard}>Save</Button>
          </Group>
        </Group>

        <DndProvider backend={HTML5Backend}>
          <Grid>
            {charts.map((chart, index) => (
              <Grid.Col span={getSpan(index)} key={chart.id}>
                <DraggableChart
                  id={chart.id}
                  index={index}
                  moveChart={moveChart}
                >
                  <AnalyticsCard
                    title={chart.name}
                    description={chart.description}
                  >
                    <ChartComponent
                      id={chart.id}
                      dataKey={chart.dataKey}
                      startDate={startDate}
                      endDate={endDate}
                      granularity={granularity}
                      checks={checks}
                    />
                  </AnalyticsCard>
                </DraggableChart>
              </Grid.Col>
            ))}
          </Grid>
        </DndProvider>
      </Stack>
    </>
  );
}
