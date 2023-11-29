import LineChart from "@/components/Blocks/Analytics/LineChart"
import { useFetchSWR, useProfile } from "@/utils/dataHooks"
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { modals } from "@mantine/modals"
import { IconBolt, IconInfoTriangle } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { Label, ReferenceLine } from "recharts"

const seatAllowance = {
  free: 1,
  pro: 4,
  unlimited: 10,
  custom: 100,
}

const eventsAllowance = {
  free: 1000,
  pro: 4000,
  unlimited: 20000,
  custom: 1000000,
}

export default function Billing() {
  const { profile, loading } = useProfile()

  const { data: usage } = useFetchSWR("/analytics/usage")

  const plan = profile?.org.plan

  if (loading) return <Loader />

  // const percent = plan === "pro" ? (usage / eventsAllowance[plan]) * 100 : 1

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

  const canUpgrade = ["free", "pro"].includes(plan)

  return (
    <Container className="unblockable">
      <NextSeo title="Billing" />
      <Stack>
        <Group justify="space-between">
          <Title>Billing</Title>

          {canUpgrade && (
            <Button
              variant="gradient"
              size="xs"
              gradient={{ from: "#0788ff", to: "#9900ff", deg: 30 }}
              leftSection={<IconBolt size="16" />}
              onClick={() =>
                modals.openContextModal({
                  modal: "upgrade",
                  size: 900,
                  innerProps: {},
                })
              }
            >
              Upgrade
            </Button>
          )}
        </Group>
        <Text size="lg">
          You are currently on the <Badge>{plan}</Badge> plan.
        </Text>
        {profile?.org?.limited && (
          <Alert
            color="red"
            variant="outline"
            icon={<IconInfoTriangle />}
            title="Allowance Reached"
          >
            Request allowance limit reached. Please upgrade to restore access.
          </Alert>
        )}

        <LineChart
          title={<Title order={3}>Events Usage</Title>}
          range={30}
          data={usage}
          formatter={(val) => `${val} runs`}
          props={["count"]}
          chartExtra={
            <ReferenceLine
              y={eventsAllowance[plan]}
              fontWeight={600}
              ifOverflow="extendDomain"
              stroke="red"
              strokeDasharray="3 3"
            >
              <Label
                position="insideTop"
                fontSize="14"
                fill="#d00"
                style={{ padding: "2px" }}
              >
                {`plan limit (${eventsAllowance[plan]} / day)`}
              </Label>
            </ReferenceLine>
          }
        />
        <Card withBorder radius="md" padding="xl">
          <Stack gap="sm">
            <Text fz="md" fw={700} size="lg">
              Seat Allowance
            </Text>
            <Text fz="lg" fw={500}>
              {profile?.org.users?.length} / {seatAllowance[plan]} users
            </Text>
            <Progress
              value={(profile?.org.users.length / seatAllowance[plan]) * 100}
              size="lg"
              color="orange"
              radius="xl"
            />
          </Stack>
        </Card>
        {profile.org.stripe_customer && (
          <Card withBorder radius="md" padding="xl">
            <Stack align="start">
              <Title order={3}>Customer Portal</Title>

              <Text>
                Use the Customer Portal to update your payment method, download
                invoices and view your billing history.
              </Text>

              <Button size="sm" onClick={redirectToCustomerPortal}>
                Manage Billing
              </Button>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  )
}
