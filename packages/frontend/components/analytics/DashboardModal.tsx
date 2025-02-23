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
  Tooltip,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import {
  IconCheck,
  IconPlus,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { DEFAULT_CHARTS, LogicNode } from "shared";
import AnalyticsCard from "./AnalyticsCard";
import { CustomChartCreator } from "./ChartCreator";
import ChartComponent from "./Charts/ChartComponent";
import { Granularity } from "./DateRangeGranularityPicker";
import { useOrg } from "@/utils/dataHooks";

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
  const { org } = useOrg();
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [isCreatingCustomChart, setIsCreatingCustomChart] = useState(false);
  const [chartToEdit, setChartToEdit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("default");

  function handleApply() {
    onApply(selectedCharts);
    setSelectedCharts([]);
    close();
  }

  const handleEditChart = (chart: any) => {
    setChartToEdit(chart);
    setIsCreatingCustomChart(true);
    setActiveTab("custom");
  };
  const customChartsEnabled =
    org?.license?.customChartsEnabled || org?.customChartsEnabled;

  return (
    <Modal opened={opened} onClose={close} withCloseButton={false} size="80vw">
      {!isCreatingCustomChart && (
        <Group justify="right">
          <Tooltip label="Feature available to selected customers. Please contact us at hello@lunary.ai or on the chat to request access.">
            <Button
              variant="outline"
              leftSection={<IconPlus />}
              onClick={() => setIsCreatingCustomChart(true)}
              data-disabled={!customChartsEnabled}
            >
              Create Chart
            </Button>
          </Tooltip>
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
          setActiveTab={setActiveTab}
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
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
  activeTab,
  setActiveTab,
}: ChartSelectionPanelProps) {
  const defaultCharts = Object.values(DEFAULT_CHARTS);
  const { org } = useOrg();
  const {
    customCharts,
    isLoading: customChartsLoading,
    isMutating,
    remove: removeCustomChart,
  } = useCustomCharts();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === "light" ? "#fcfcfc" : "inherit";

  const customChartsEnabled =
    org?.license?.customChartsEnabled || org?.customChartsEnabled;

  function toggleChartSelection(chartId: string) {
    setSelectedCharts((prev) =>
      prev.includes(chartId)
        ? prev.filter((id) => id !== chartId)
        : [...prev, chartId],
    );
  }

  useEffect(() => {
    if (
      !customChartsLoading &&
      customCharts.length === 0 &&
      activeTab === "custom" &&
      !isMutating
    ) {
      onEditChart(null);
    }
  }, [customChartsLoading, customCharts, activeTab, onEditChart, isMutating]);

  async function handleDeleteChart(e: React.MouseEvent, chartId: string) {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this custom chart?")) {
      await removeCustomChart(chartId);
    }
  }

  return (
    <>
      <Tabs value={activeTab} onChange={setActiveTab} pb="xl" variant="outline">
        <Tabs.List mt="md">
          <Tabs.Tab value="default">Default Charts</Tabs.Tab>
          {customChartsEnabled && (
            <Tabs.Tab value="custom">Custom Charts</Tabs.Tab>
          )}
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
              <>
                {customCharts.length > 0 && (
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
                                  display: "flex",
                                  gap: "4px",
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
                                >
                                  <IconPencil size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="light"
                                  size="sm"
                                  color="red"
                                  onClick={(e) =>
                                    handleDeleteChart(e, chart.id)
                                  }
                                >
                                  <IconTrash size={16} />
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
                                startDate={
                                  new Date(chart.startDate || startDate)
                                }
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
                          </Box>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                )}
              </>
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
