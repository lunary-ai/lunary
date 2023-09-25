import { formatLargeNumber } from "@/utils/format"
import { useProfile, useTeam } from "@/utils/supabaseHooks"
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
  Alert,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { IconInfoTriangle } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useEffect, useState } from "react"

export default function Billing() {
  const { team, loading } = useTeam()
  const supabaseClient = useSupabaseClient()

  const [usage, setUsage] = useState(0)

  useEffect(() => {
    if (team) {
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
  }, [team])

  if (loading) return <Loader />

  const percent = (usage / 30000) * 100

  const seatAllowance = team?.plan === "free" ? 1 : 5

  return (
    <Container>
      <NextSeo title="Billing" />
      <Stack>
        <Title>Billing</Title>

        <Text size="lg">
          You are currently on the <Badge>{team?.plan}</Badge> plan.
        </Text>

        {team?.plan === "free" && (
          <>
            {percent > 99 && (
              <Alert
                color="red"
                variant="outline"
                icon={<IconInfoTriangle />}
                title="Allowance Reached"
              >
                You have reached your monthly request allowance. Please upgrade
                to keep access to your data.
              </Alert>
            )}
            <Button
              onClick={() =>
                modals.openContextModal({
                  modal: "upgrade",
                  size: 800,
                  innerProps: {},
                })
              }
              w={300}
            >
              Upgrade to Pro
            </Button>
          </>
        )}

        <Card withBorder radius="md" padding="xl">
          <Stack spacing="sm">
            <Text fz="md" fw={700} c="dimmed">
              Monthly Requests Allowance
            </Text>
            <Text fz="lg" fw={500}>
              {formatLargeNumber(usage)} / {formatLargeNumber(30000)} requests
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
              1 / {seatAllowance} users
            </Text>
            <Progress
              value={(team?.users?.length / seatAllowance) * 100}
              size="lg"
              color="orange"
              radius="xl"
            />
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
