import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import { IconCheck, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { DEFAULT_CHARTS, LogicNode } from "shared";
import AnalyticsCard from "./AnalyticsCard";
import ChartComponent from "./Charts/ChartComponent";
import chartProps from "./Charts/chartProps";

interface DashboardModalProps {
  opened: boolean;
  close: () => void;
  startDate: Date;
  endDate: Date;
  granularity: "hourly" | "daily" | "weekly" | "monthly";
  checks: LogicNode;
  onApply: (selectedChartIds: string[]) => void;
}

export default function DashboardModal({
  opened,
  close,
  startDate,
  endDate,
  granularity,
  checks,
  onApply,
}: DashboardModalProps): JSX.Element {
  const charts = DEFAULT_CHARTS.map((chartId) => chartProps[chartId]);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);

  function toggleChartSelection(chartId: string) {
    setSelectedCharts((prev) =>
      prev.includes(chartId)
        ? prev.filter((id) => id !== chartId)
        : [...prev, chartId],
    );
  }

  function handleApply() {
    onApply(selectedCharts);
    setSelectedCharts([]);
    close();
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
      title="Dashboard Settings"
      size="80vw"
    >
      <Stack gap="lg">
        <SimpleGrid cols={2} spacing="lg">
          {charts.map((chart) => {
            const isSelected = selectedCharts.includes(chart.id);
            return (
              <Box
                key={chart.id}
                onClick={() => toggleChartSelection(chart.id)}
                style={{ cursor: "pointer", position: "relative" }}
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
                  />
                </AnalyticsCard>
              </Box>
            );
          })}
        </SimpleGrid>

        <Group justify="right">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
