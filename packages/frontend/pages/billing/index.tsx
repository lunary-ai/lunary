import LineChart from "@/components/analytics/LineChart"
import { UpgradePlans, openUpgrade } from "@/components/layout/UpgradeModal"
import errorHandler from "@/utils/errors"
import { useOrg } from "@/utils/dataHooks"
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconBolt, IconInfoTriangle } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { Label, ReferenceLine } from "recharts"
import useSWR from "swr"
import { EVENTS_ALLOWANCE } from "@/utils/pricing"
import { fetcher } from "@/utils/fetcher"
import SeatAllowanceCard from "@/components/blocks/SeatAllowanceCard"
import { SettingsCard } from "@/components/blocks/SettingsCard"

export default function Billing() {
  const { org, loading } = useOrg()

  const { data: usage } = useSWR(`/orgs/${org?.id}/usage`)

  const plan = org?.plan

  if (loading) return <Loader />

  const redirectToCustomerPortal = async () => {
    const data = await errorHandler(
      await fetcher.get(`/orgs/${org.id}/billing-portal`),
    )

    if (!data) return

    window.location.href = data.url
  }

  const canUpgrade = plan && ["free", "pro"].includes(plan)

  return (
    <Container className="unblockable">
      <NextSeo title="Billing" />
      <Stack gap="xl">
        <Stack gap="md">
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
                Your plan will cancel soon. Upon return to the free plan, any
                data older than 30 days will be permanently deleted as per the
                free plan limits. Reactivate your plan to ensure uninterrupted
                access.
              </Text>
            </Alert>
          ) : (
            <Text size="lg">
              You are currently on the <Badge>{plan}</Badge> plan{" "}
              {plan ? `(billed ${org?.planPeriod})` : ""}.
            </Text>
          )}
        </Stack>

        {!["custom"].includes(plan) && (
          <Card withBorder radius="md" padding="xl">
            <Container size="lg">
              <UpgradePlans />
            </Container>
          </Card>
        )}

        <LineChart
          title={<Title order={3}>Events Usage</Title>}
          range={30}
          data={usage}
          formatter={(val) => `${val} runs`}
          props={["count"]}
          chartExtra={
            plan && (
              <ReferenceLine
                y={EVENTS_ALLOWANCE[plan]}
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
                  {`plan limit (${EVENTS_ALLOWANCE[plan]} / day)`}
                </Label>
              </ReferenceLine>
            )
          }
        />

        <SeatAllowanceCard />

        {org?.stripeCustomer && (
          <SettingsCard title="Customer Portal">
            <Text>
              Use the Customer Portal to update your payment method, download
              invoices and view your billing history.
            </Text>

            <Button size="sm" onClick={redirectToCustomerPortal}>
              Manage Billing
            </Button>
          </SettingsCard>
        )}
      </Stack>
    </Container>
  )
}
