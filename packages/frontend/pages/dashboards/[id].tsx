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
import {
  IconDotsVertical,
  IconHome,
  IconHome2,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Chart, deserializeLogic, LogicNode } from "shared";

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
    }
  }, [dashboard]);

  // TODO: isValidating
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
      chartIds: charts.map((chart) => chart.id),
    });
  }

  function handleDrop(item, monitor, chartId: string) {
    console.log(item, monitor, chartId);
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

        <Grid>
          {charts.map((chart, index) => (
            <Grid.Col span={getSpan(index)} key={chart.id}>
              <Draggable style={{ height: "100%" }}>
                <Droppable
                  style={{ height: "100%" }}
                  onDrop={(item, monitor) =>
                    handleDrop(item, monitor, chart.id)
                  }
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
                </Droppable>
              </Draggable>
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    </>
  );
}

function Draggable({ children, ...props }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "chart",
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag} {...props}>
      {children}
    </div>
  );
}

function Droppable({ children, onDrop, ...props }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "chart",
    drop: onDrop,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div ref={drop} {...props}>
      {isOver && "Over"}
      {children}
    </div>
  );
}
