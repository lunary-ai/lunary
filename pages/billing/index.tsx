import { formatLargeNumber } from "@/utils/format"
import { useProfile } from "@/utils/dataHooks"
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

const seatAllowance = {
  free: 1,
  pro: 5,
  custom: 100,
}

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
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .then(({ count }) => {
          setUsage(count)
        })
    }
  }, [profile])

  if (loading) return <Loader />

  const percent = profile?.org.plan === "pro" ? (usage / 30000) * 100 : 1

  const redirectToCustomerPortal = async () => {
    const body = await fetch("/api/user/stripe-portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: profile?.org.stripe_customer,
        origin: window.location.origin,
      }),
    })

    const { url } = await body.json()

    // redirect to stripe portal

    window.location.href = url
  }

  return (
    <Container>
      <NextSeo title="Billing" />
      <Stack>
        <Title>Billing</Title>

        <Text size="lg">
          You are currently on the <Badge>{profile?.org?.plan}</Badge> plan.
        </Text>

        {profile?.org?.plan === "free" && (
          <>
            {percent > 99 && (
              <Alert
                color="red"
                variant="outline"
                icon={<IconInfoTriangle />}
                title="Allowance Reached"
              >
                You have reached your monthly request allowance. Please upgrade
                to keep your data from being deleted.
              </Alert>
            )}
            <Button
              onClick={() =>
                modals.openContextModal({
                  modal: "upgrade",
                  size: 900,
                  innerProps: {
                    highlight: "events",
                  },
                })
              }
              w={300}
            >
              Upgrade
            </Button>
          </>
        )}

        <Card withBorder radius="md" padding="xl">
          <Stack spacing="sm">
            <Text fz="md" fw={700} c="dimmed">
              Monthly Usage
            </Text>
            <Text fz="lg" fw={500}>
              {formatLargeNumber(usage)} /{" "}
              {profile?.org.plan === "free" ? formatLargeNumber(30000) : "∞"}{" "}
              requests
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
              {profile?.org.users?.length} / {seatAllowance[profile?.org.plan]}{" "}
              users
            </Text>
            <Progress
              value={
                (profile?.org.users.length / seatAllowance[profile?.org.plan]) *
                100
              }
              size="lg"
              color="orange"
              radius="xl"
            />
          </Stack>
        </Card>

        {profile.org.stripe_customer && (
          <Card withBorder radius="md" padding="xl">
            <Title order={3} mb="lg">
              Customer Portal
            </Title>

            <Button size="sm" onClick={redirectToCustomerPortal}>
              Manage Billing
            </Button>
          </Card>
        )}
      </Stack>
    </Container>
  )
}
