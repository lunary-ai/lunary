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
  Button,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import Script from "next/script"
import { use, useEffect, useState } from "react"

export default function Billing() {
  const { profile, loading } = useProfile()
  const supabaseClient = useSupabaseClient()

  const [usage, setUsage] = useState(0)

  useEffect(() => {
    if (profile) {
      // last 30 days of runs
      supabaseClient
        .from("run")
        .select("*", { count: "estimated", head: true })
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        )
        .then(({ count }) => {
          console.log(count)
          setUsage(count)
        })
    }
  }, [profile])

  if (loading) return <Loader />

  const percent = (usage / 30000) * 100

  return (
    <Container>
      <Stack>
        <Title>Billing</Title>

        <Text size="lg">
          You are currently on a <Badge>{profile?.plan}</Badge> plan.
        </Text>

        {profile?.plan === "free" && (
          <Button
            onClick={() =>
              modals.openContextModal({ modal: "upgrade", innerProps: {} })
            }
            w={300}
          >
            Upgrade to Pro
          </Button>
        )}

        <Card withBorder radius="md" padding="xl">
          <Stack spacing="sm">
            <Text fz="md" fw={700} c="dimmed">
              Monthly Queries Allowance
            </Text>
            <Text fz="lg" fw={500}>
              {usage} / 30.000 requests
            </Text>
            <Progress
              value={percent}
              size="lg"
              radius="xl"
              color={percent > 99 ? "red" : "blue"}
            />
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
            <Progress value={100} size="lg" color="orange" radius="xl" />
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
