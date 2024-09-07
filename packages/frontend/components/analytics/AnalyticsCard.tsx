import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { Card, Text } from "@mantine/core";

function AnalyticsCard({ title, children }) {
  return (
    <Card withBorder style={{ "&:children": { maxWidth: "100%" } }}>
      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
        {title}
      </Text>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Card>
  );
}

export default AnalyticsCard;
