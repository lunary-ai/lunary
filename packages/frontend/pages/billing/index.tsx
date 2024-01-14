import LineChart from "@/components/Analytics/LineChart"
import { UpgradePlans, openUpgrade } from "@/components/Layout/UpgradeModal"
import errorHandler from "@/utils/errorHandler"
import { useOrg } from "@/utils/dataHooks"
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
import { IconBolt, IconInfoTriangle } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { Label, ReferenceLine } from "recharts"
import useSWR from "swr"

const seatAllowance = {
  free: 1,
  pro: 4,
  unlimited: 10,
  custom: 100,
}

const eventsAllowance = {
  free: 1000,
  pro: 4000,
  unlimited: 100000,
  custom: 1000000,
}

export default function Billing() {
  const { org, loading } = useOrg()

  const { data: usage } = useSWR(`/orgs/${org?.id}/usage`)

  const plan = org?.plan

  if (loading) return <Loader />

  const redirectToCustomerPortal = async () => {
    const data = await errorHandler(
      (
        await fetch("/api/user/stripe-portal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer: org?.stripeCustomer,
            origin: window.location.origin,
          }),
        })
      ).json(),
    )

    if (!data) return

    // redirect to stripe portal

    window.location.href = data.url
  }

  const canUpgrade = plan && ["free", "pro"].includes(plan)

  return (
    <Container className="unblockable">
      <NextSeo title="Billing" />
      <Stack gap="lg">
        <Group justify="space-between">
          <Title>Billing</Title>

          {canUpgrade && (
            <Button
              variant="gradient"
              size="md"
              pr="lg"
              gradient={{ from: "#0788ff", to: "#9900ff", deg: 30 }}
              leftSection={<IconBolt fill="#fff" size={18} />}
              onClick={() => openUpgrade()}
            >
              Upgrade
            </Button>
          )}
        </Group>

        {org?.limited && (
          <Alert
            color="red"
            variant="outline"
            icon={<IconInfoTriangle />}
            title="Allowance Reached"
          >
            Request allowance limit reached. Please upgrade to restore access.
          </Alert>
        )}

        {org?.canceled ? (
          <Alert
            color="red"
            fz="xl"
            variant="filled"
            icon={<IconInfoTriangle />}
          >
            <Text fz="lg">
              Your plan will cancel soon. Upon cancellation, any data older than
              30 days will be permanently deleted as per the free plan limits.
              Reactivate your plan to ensure uninterrupted access.
            </Text>
          </Alert>
        ) : (
          <Text size="lg">
            You are currently on the <Badge>{plan}</Badge> plan{" "}
            {plan ? `(billed ${org?.planPeriod})` : ""}.
          </Text>
        )}

        <Card withBorder radius="md" padding="xl">
          <UpgradePlans />
        </Card>

        <LineChart
          title={<Title order={3}>Events Usage</Title>}
          range={30}
          data={usage}
          formatter={(val) => `${val} runs`}
          props={["count"]}
          chartExtra={
            plan && (
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
            )
          }
        />
        {plan && (
          <Card withBorder radius="md" padding="xl">
            <Stack gap="sm">
              <Text fz="md" fw={700} size="lg">
                Seat Allowance
              </Text>
              <Text fz="lg" fw={500}>
                {org?.users?.length} / {seatAllowance[plan]} users
              </Text>
              <Progress
                value={((org?.users?.length || 0) / seatAllowance[plan]) * 100}
                size="lg"
                color="orange"
                radius="xl"
              />
            </Stack>
          </Card>
        )}
        {org?.stripeCustomer && (
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
