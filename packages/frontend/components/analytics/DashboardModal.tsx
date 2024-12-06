import { Modal, SimpleGrid } from "@mantine/core";
import { DEFAULT_CHARTS, LogicNode } from "shared";
import chartProps from "./Charts/chartProps";
import ChartComponent from "./Charts/ChartComponent";
import AnalyticsCard from "./AnalyticsCard";

interface DashboardModalProps {
  opened: boolean;
  close: () => void;
  startDate: Date;
  endDate: Date;
  granularity: "hourly" | "daily" | "weekly" | "monthly" | "monthly";
  checks: LogicNode;
}

export default function DashboardModal({
  opened,
  close,
  startDate,
  endDate,
  granularity,
  checks,
}: DashboardModalProps): JSX.Element {
  const charts = DEFAULT_CHARTS.map((chartId) => chartProps[chartId]);
  return (
    <Modal
      opened={opened}
      onClose={close}
      title="Dashboard Settings"
      size="80vw"
    >
      <SimpleGrid cols={2} spacing="lg">
        {charts.map((chart) => (
          <AnalyticsCard
            title={chart.name}
            description={chart.description}
            key={chart.id}
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
        ))}
      </SimpleGrid>
    </Modal>
  );
}
