import { useOrg } from "@/utils/dataHooks"
import { SEAT_ALLOWANCE } from "@/utils/pricing"
import { Card, Progress, Stack, Text } from "@mantine/core"

export default function SeatAllowanceCard() {
  const { org } = useOrg()

  if (!org?.plan) {
    return null
  }

  return (
    <Card withBorder radius="md" padding="xl">
      <Stack gap="sm">
        <Text fz="md" fw={700} size="lg">
          Seat Allowance
        </Text>
        <Text fz="lg" fw={500}>
          {org?.users?.length} / {SEAT_ALLOWANCE[org?.plan]} users
        </Text>
        <Progress
          value={((org?.users?.length || 0) / SEAT_ALLOWANCE[org?.plan]) * 100}
          size="lg"
          color="orange"
          radius="xl"
        />
      </Stack>
    </Card>
  )
}
