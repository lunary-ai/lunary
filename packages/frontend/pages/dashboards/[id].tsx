import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import ChartComponent from "@/components/analytics/Charts/ChartComponent";
import chartProps from "@/components/analytics/Charts/chartProps";
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
import {
  IconDotsVertical,
  IconHome,
  IconHome2,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Chart } from "shared";

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

  // TODO: rename dashboard `checks` to `filters`
  const [filters, setFilters] = useState<any>();

  // TODO
  const { dateRange, setDateRange, granularity, setGranularity } =
    useDateRangeGranularity();

  const [charts, setCharts] = useState<Chart[]>([]);

  useEffect(() => {
    if (!dashboardIsLoading && dashboard) {
      setFilters(dashboard.checks);
      setCharts(dashboard.charts.map((chartId) => chartProps[chartId]));
    }
  }, [dashboard]);
  // const serializedChecks = serializeLogic(checks);

  // TODO: isValidating
  if (dashboardIsLoading || !dashboard) {
    return (
      <Flex align="center" justify="center" h="280px">
        <Loader />
      </Flex>
    );
  }

  return (
    <Stack pt="24px">
      <Group justify="space-between">
        <Group>
          <Group gap="xs">
            {dashboard.isHome && (
              <IconHome fill="black" stroke="2px" size={22} />
            )}
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
            dateRange={dateRange}
            setDateRange={setDateRange}
            granularity={granularity}
            setGranularity={setGranularity}
          />
          <CheckPicker
            minimal={true}
            value={filters}
            onChange={setFilters}
            restrictTo={(filter) =>
              ["models", "tags", "users", "metadata"].includes(filter.id)
            }
          />
        </Group>
        <Button>Save</Button>
      </Group>

      <Grid>
        {charts.map((chart, index) => (
          <Grid.Col span={getSpan(index)} key={chart.id}>
            <AnalyticsCard title={chart.name} description={chart.description}>
              <ChartComponent
                id={chart.id}
                dataKey={chart.dataKey}
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                granularity={granularity}
              />
            </AnalyticsCard>
          </Grid.Col>
        ))}

        {/* <Grid.Col span={4}>
          <AnalyticsCard title="1">
            <Text>1</Text>
          </AnalyticsCard>
        </Grid.Col>

        <Grid.Col span={4}>
          <AnalyticsCard title="2">
            <Text>2</Text>
          </AnalyticsCard>
        </Grid.Col>

        <Grid.Col span={4}>
          <AnalyticsCard title="3">
            <Text>3</Text>
          </AnalyticsCard>
        </Grid.Col>

        <Grid.Col span={12}>
          <AnalyticsCard title="4">
            <Text>4</Text>
          </AnalyticsCard>
        </Grid.Col>

        <Grid.Col span={6}>
          <AnalyticsCard title="5">
            <Text>5</Text>
          </AnalyticsCard>
        </Grid.Col>

        <Grid.Col span={6}>
          <AnalyticsCard title="6">
            <Text>6</Text>
          </AnalyticsCard>
        </Grid.Col> */}
      </Grid>
    </Stack>
  );
}
