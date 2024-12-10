import { useCustomCharts } from "@/utils/dataHooks/dashboards";
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Tabs,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { IconCheck, IconPlus, IconPencil } from "@tabler/icons-react";
import { useState } from "react";
import { DEFAULT_CHARTS, LogicNode } from "shared";
import AnalyticsCard from "./AnalyticsCard";
import { CustomChartCreator } from "./ChartCreator";
import ChartComponent from "./Charts/ChartComponent";
import { Granularity } from "./DateRangeGranularityPicker";

interface DashboardModalProps {
  opened: boolean;
  close: () => void;
  startDate: Date;
  endDate: Date;
  granularity: "hourly" | "daily" | "weekly" | "monthly";
  checks: LogicNode;
  onApply: (selectedChartIds: string[]) => void;
  dashboardStartDate?: Date;
  dashboardEndDate?: Date;
  dashboardGranularity?: Granularity;
}

export default function DashboardModal({
  opened,
  close,
  startDate,
  endDate,
  granularity,
  checks,
  onApply,
  dashboardStartDate,
  dashboardEndDate,
  dashboardGranularity,
}: DashboardModalProps): JSX.Element {
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [isCreatingCustomChart, setIsCreatingCustomChart] = useState(false);
  const [chartToEdit, setChartToEdit] = useState<any>(null);

  function handleApply() {
    onApply(selectedCharts);
    setSelectedCharts([]);
    close();
  }

  const handleEditChart = (chart: any) => {
    setChartToEdit(chart);
    setIsCreatingCustomChart(true);
  };

  return (
    <Modal opened={opened} onClose={close} withCloseButton={false} size="80vw">
      {!isCreatingCustomChart && (
        <Group justify="right">
          <Button
            variant="outline"
            leftSection={<IconPlus />}
            onClick={() => setIsCreatingCustomChart(true)}
          >
            Create Chart
          </Button>
        </Group>
      )}

      {isCreatingCustomChart ? (
        <CustomChartCreator
          dashboardStartDate={dashboardStartDate}
          dashboardEndDate={dashboardEndDate}
          dashboardGranularity={dashboardGranularity}
          onConfirm={() => {
            setIsCreatingCustomChart(false);
            setChartToEdit(null);
          }}
          config={chartToEdit || {}}
        />
      ) : (
        <ChartSelectionPanel
          startDate={startDate}
          endDate={endDate}
          granularity={granularity}
          checks={checks}
          selectedCharts={selectedCharts}
          setSelectedCharts={setSelectedCharts}
          onClose={close}
          onApply={handleApply}
          onEditChart={handleEditChart}
        />
      )}
    </Modal>
  );
}

interface ChartSelectionPanelProps {
  startDate: Date;
  endDate: Date;
  granularity: "hourly" | "daily" | "weekly" | "monthly";
  checks: LogicNode;
  selectedCharts: string[];
  setSelectedCharts: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onApply: () => void;
  onEditChart: (chart: any) => void;
}

function ChartSelectionPanel({
  startDate,
  endDate,
  granularity,
  checks,
  selectedCharts,
  setSelectedCharts,
  onClose,
  onApply,
  onEditChart,
}: ChartSelectionPanelProps) {
  const defaultCharts = Object.values(DEFAULT_CHARTS);
  const { customCharts, isLoading: customChartsLoading } = useCustomCharts();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "light" ? "#fcfcfc" : "inherit";

  function toggleChartSelection(chartId: string) {
    setSelectedCharts((prev) =>
      prev.includes(chartId)
        ? prev.filter((id) => id !== chartId)
        : [...prev, chartId],
    );
  }

  return (
    <>
      <Tabs defaultValue="default" pb="xl" variant="outline">
        <Tabs.List mt="md">
          <Tabs.Tab value="default">Default Charts</Tabs.Tab>
          <Tabs.Tab value="custom">Custom Charts</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="default" pt="lg">
          <Stack gap="lg">
            <SimpleGrid cols={2} spacing="lg">
              {defaultCharts.map((chart) => {
                const isSelected = selectedCharts.includes(chart.id);
                return (
                  <Box
                    key={chart.id}
                    style={{ position: "relative" }}
                    h="350px"
                  >
                    <Box
                      onClick={() => toggleChartSelection(chart.id)}
                      style={{ cursor: "pointer" }}
                      h="100%"
                    >
                      <AnalyticsCard
                        title={chart.name}
                        description={chart.description}
                      >
                        <Box
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            zIndex: 3,
                          }}
                        >
                          <ActionIcon
                            variant="light"
                            color={isSelected ? "blue" : "gray"}
                            size="sm"
                          >
                            {isSelected ? (
                              <IconCheck size={16} />
                            ) : (
                              <IconPlus size={16} />
                            )}
                          </ActionIcon>
                        </Box>
                        <ChartComponent
                          id={chart.id}
                          dataKey={chart.dataKey}
                          startDate={startDate}
                          endDate={endDate}
                          granularity={granularity}
                          checks={checks}
                          isCustom={false}
                          chart={chart}
                        />
                      </AnalyticsCard>
                    </Box>
                  </Box>
                );
              })}
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="custom" pt="lg">
          <Stack gap="lg">
            {customChartsLoading ? (
              <Flex align="center" justify="center" h="200px">
                <Loader />
              </Flex>
            ) : (
              <SimpleGrid cols={2} spacing="lg">
                {customCharts.map((chart) => {
                  const isSelected = selectedCharts.includes(chart.id);

                  return (
                    <Box
                      key={chart.id}
                      style={{ position: "relative" }}
                      h="334px"
                    >
                      <Box
                        onClick={() => toggleChartSelection(chart.id)}
                        style={{ cursor: "pointer", height: "100%" }}
                      >
                        <AnalyticsCard
                          title={chart.name}
                          description={chart.description}
                        >
                          <Box
                            style={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              zIndex: 3,
                            }}
                          >
                            <ActionIcon
                              variant="light"
                              size="sm"
                              color="gray"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditChart(chart);
                              }}
                              mr="sm"
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color={isSelected ? "blue" : "gray"}
                              size="sm"
                            >
                              {isSelected ? (
                                <IconCheck size={16} />
                              ) : (
                                <IconPlus size={16} />
                              )}
                            </ActionIcon>
                          </Box>

                          <ChartComponent
                            id={chart.id}
                            dataKey={chart.dataKey}
                            startDate={new Date(chart.startDate || startDate)}
                            endDate={new Date(chart.endDate || endDate)}
                            granularity={chart.granularity || granularity}
                            checks={chart.checks || checks}
                            primaryDimension={chart.primaryDimension}
                            secondaryDimension={chart.secondaryDimension}
                            aggregationMethod={chart.aggregationMethod}
                            isCustom={true}
                            chart={chart}
                          />
                        </AnalyticsCard>
                      </Box>
                    </Box>
                  );
                })}
              </SimpleGrid>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Box
        style={{
          position: "sticky",
          bottom: 0,
          backgroundColor: backgroundColor,
          zIndex: 3,
        }}
        py="md"
      >
        <Group justify="right">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onApply}>Apply</Button>
        </Group>
      </Box>
    </>
  );
}
