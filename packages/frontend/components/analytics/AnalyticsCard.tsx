import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { Card, Text } from "@mantine/core";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title?: string;
  children: ReactNode;
}

function AnalyticsCard({ title, children }: AnalyticsCardProps) {
  return (
    <Card withBorder h={"100%"} style={{ "&:children": { maxWidth: "100%" } }}>
      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
        {title}
      </Text>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Card>
  );
}

export default AnalyticsCard;
