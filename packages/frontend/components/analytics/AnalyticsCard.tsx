import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { Card, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

function AnalyticsCard({
  title,
  children,
  description = "No description available",
}: AnalyticsCardProps) {
  return (
    <Card withBorder h={"100%"} style={{ "&:children": { maxWidth: "100%" } }}>
      <Group>
        <Text c="dimmed" fw={50} fz="md">
          {title}
        </Text>

        {description && (
          <Tooltip label={description}>
            <IconInfoCircle size={16} opacity={0.5} />
          </Tooltip>
        )}
      </Group>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Card>
  );
}

export default AnalyticsCard;
