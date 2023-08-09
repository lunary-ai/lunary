import { Card, Text } from "@mantine/core"

const AnalyticsCard = ({ title, children }) => (
  <Card withBorder>
    <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
      {title}
    </Text>
    {children}
  </Card>
)

export default AnalyticsCard
