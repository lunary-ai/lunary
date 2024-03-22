import ErrorBoundary from "@/components/blocks/ErrorBoundary"
import { Card, Text } from "@mantine/core"

const AnalyticsCard = ({ title, children }) => (
  <Card withBorder>
    <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
      {title}
    </Text>
    <ErrorBoundary>{children}</ErrorBoundary>
  </Card>
)

export default AnalyticsCard
