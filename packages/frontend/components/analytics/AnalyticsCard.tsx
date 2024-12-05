import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { Card, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title: string;
  description: string | null;
  children: ReactNode;
}

function AnalyticsCard({ title, children, description }: AnalyticsCardProps) {
  return (
    <Card withBorder h={"100%"} style={{ "&:children": { maxWidth: "100%" } }}>
      <Group>
        <Text c="dimmed" fw={50} fz="md">
          {title}
        </Text>

        <Tooltip label={description || "No description available"}>
          <IconInfoCircle size={16} opacity={0.5} />
        </Tooltip>
      </Group>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Card>
  );
}

export default AnalyticsCard;
