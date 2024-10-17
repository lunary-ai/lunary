import { useOrg } from "@/utils/dataHooks";
import { SEAT_ALLOWANCE } from "@/utils/pricing";
import { Card, Progress, Stack, Text } from "@mantine/core";
import { SettingsCard } from "./SettingsCard";

export default function SeatAllowanceCard() {
  const { org } = useOrg();

  if (!org?.plan) {
    return null;
  }

  const seatAllowance = org?.seatAllowance || SEAT_ALLOWANCE[org?.plan];

  return (
    <SettingsCard title="Seat Allowance">
      <Text fz="lg" fw={500}>
        {org?.users?.length} / {seatAllowance} users
      </Text>
      <Progress
        value={((org?.users?.length || 0) / seatAllowance) * 100}
        size="lg"
        color="orange"
        radius="xl"
      />
    </SettingsCard>
  );
}
