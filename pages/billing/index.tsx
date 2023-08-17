import { useProfile } from "@/utils/supabaseHooks"
import {
  Badge,
  Stack,
  Text,
  Progress,
  Card,
  Title,
  Loader,
  Container,
} from "@mantine/core"
import Script from "next/script"

export default function Billing() {
  const { profile, loading } = useProfile()

  if (loading) return <Loader />

  return (
    <Container>
      <Stack>
        <Title>Billing</Title>

        <Text size="lg">
          You are currently on a <Badge>{profile?.plan}</Badge> plan.
        </Text>

        <Card withBorder radius="md" padding="xl">
          <Stack spacing="sm">
            <Text fz="md" fw={700} c="dimmed">
              Monthly Queries Allowance
            </Text>
            <Text fz="lg" fw={500}>
              ∞ / ∞ queries
            </Text>
            <Progress value={1} size="lg" radius="xl" />
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="xl">
          <Stack spacing="sm">
            <Text fz="md" fw={700} c="dimmed">
              Seat Allowance
            </Text>
            <Text fz="lg" fw={500}>
              1 / 1 users
            </Text>
            <Progress value={100} size="lg" radius="xl" />
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
