import analytics from "@/utils/analytics"

import { ContextModalProps, modals } from "@mantine/modals"
import {
  IconAnalyze,
  IconBrandDocker,
  IconCheck,
  IconCircleCheck,
} from "@tabler/icons-react"

import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Highlight,
  List,
  Mark,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core"

import { useCallback, useEffect, useState } from "react"
import SocialProof from "../blocks/SocialProof"
import errorHandler from "@/utils/errors"
import { notifications } from "@mantine/notifications"
import { capitalize } from "@/utils/format"
import { useOrg } from "@/utils/dataHooks"
import { fetcher } from "@/utils/fetcher"

function PlanFeatures({ features, highlight }) {
  return (
    <List
      spacing="sm"
      size="sm"
      mb={20}
      center
      icon={
        <ThemeIcon color="teal" size={24} radius="xl">
          <IconCircleCheck size="16" />
        </ThemeIcon>
      }
    >
      {features.map(({ title, id }) => (
        <List.Item key={id}>
          <Highlight highlight={highlight === id ? title : ""}>
            {title}
          </Highlight>
        </List.Item>
      ))}
    </List>
  )
}

function RenderPrice({ price, period }) {
  // year = 2 months free
  const discount = period === "yearly" ? 2 / 12 : 0
  const monthlyPrice = Math.floor(price * (1 - discount))

  return (
    <Group align="center" gap={10}>
      <Title order={3} size={30}>
        {discount > 0 && (
          <Text
            td="line-through"
            mr={5}
            c="dimmed"
            span
            fz={20}
          >{`$${price}`}</Text>
        )}
        ${monthlyPrice}
        <Text span fz={20}>
          {` / mo`}
        </Text>
      </Title>
    </Group>
  )
}

export function UpgradePlans({ highlight }: { highlight?: string }) {
  const { org } = useOrg()
  const [period, setPeriod] = useState("yearly")
  const [loading, setLoading] = useState(null)

  const plan = org?.plan || "free"

  const upgradePlan = async (plan) => {
    setLoading(plan)

    const res = await errorHandler(
      fetcher.post(`/orgs/${org.id}/upgrade`, {
        arg: {
          plan,
          period,
          origin: window.location.origin,
        },
      }),
    )

    if (res?.ok) {
      //   // Redirect to Stripe Checkout session
      if (res.url) return (window.location.href = res.url)

      notifications.show({
        title: "Plan updated",
        message: `Your plan has been updated to ${plan}!`,
        icon: <IconCheck />,
        color: "green",
      })

      // Give time for the Stripe webhook to update the plan
      setTimeout(() => {
        window.location.href = "/billing/thank-you"
      }, 1000)
    }

    setLoading(null)
  }

  const buttonText = useCallback(
    (newPlan) => {
      if (org?.canceled && newPlan === plan)
        return { children: "Reactivate", variant: "gradient" }

      if (org?.canceled)
        return {
          children: `Reactivate on ${capitalize(newPlan)}`,
          variant: "gradient",
        }

      if (newPlan === plan && period !== org?.planPeriod)
        return { children: "Switch to " + period, variant: "outline" }

      if (newPlan === plan) return { children: "Current plan", disabled: true }

      if (newPlan === "pro" && plan === "unlimited")
        return { children: "Downgrade", variant: "subtle" }

      return { children: "Upgrade", variant: "gradient" }
    },
    [period, org, plan],
  )

  return (
    <>
      <SegmentedControl
        w={"fit-content"}
        mx="auto"
        size="sm"
        display="flex"
        mb="lg"
        value={period}
        onChange={setPeriod}
        data={[
          {
            label: (
              <Group ml={6} align="center" gap={5} wrap="nowrap">
                Annually
                <Badge color="green" variant="light">
                  2 months free
                </Badge>
              </Group>
            ),
            value: "yearly",
          },
          { label: "Monthly", value: "monthly" },
        ]}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card p="lg" withBorder>
          <Stack justify="space-between" h="100%">
            <Stack>
              <Group>
                <Text
                  tt="uppercase"
                  fw="bold"
                  variant="gradient"
                  gradient={{ from: "indigo", to: "cyan", deg: 45 }}
                >
                  Pro
                </Text>
                {plan === "pro" && (
                  <Text size="lg" c="dimmed" ta="center">
                    (current plan)
                  </Text>
                )}
              </Group>

              <RenderPrice price={29} period={period} />

              <PlanFeatures
                features={[
                  { id: "events", title: "4k events per day" },
                  { id: "team", title: "4 team members" },
                  { id: "projects", title: "Unlimited Projects" },
                  { id: "analytics", title: "Advanced Analytics" },
                  { id: "playground", title: "Playground" },
                  { id: "export", title: "Exports & API" },
                ]}
                highlight={highlight}
              />
            </Stack>

            <Button
              size="md"
              onClick={() => upgradePlan("pro")}
              fullWidth
              loading={loading === "pro"}
              gradient={{ from: "violet", to: "blue", deg: 45 }}
              color="violet"
              mt="auto"
              {...buttonText("pro")}
            />
          </Stack>
        </Card>

        <Card p="lg" withBorder>
          <Group gap={6}>
            <Text
              tt="uppercase"
              fw="bold"
              variant="gradient"
              gradient={{ from: "teal", to: "lime", deg: 45 }}
            >
              Unlimited
            </Text>
            {plan === "unlimited" && (
              <Text size="lg" c="dimmed" ta="center">
                (current plan)
              </Text>
            )}
          </Group>

          <Group mb={20} mt={10} align="center" gap={10}>
            <RenderPrice price={199} period={period} />
          </Group>

          <Text mb="xs" size="sm" mt={-10}>
            Everything in Pro, plus:
          </Text>

          <PlanFeatures
            features={[
              { id: "events", title: "Unlimited events" },
              { id: "team", title: "10 team members" },
              { id: "evaluate", title: "Evaluations" },
              { id: "radar", title: "Radars & Alerts" },
              { id: "support", title: "Shared Slack channel" },
            ]}
            highlight={highlight}
          />

          <Button
            size="md"
            onClick={() => upgradePlan("unlimited")}
            fullWidth
            loading={loading === "unlimited"}
            gradient={{ from: "teal", to: "lime", deg: 45 }}
            color="teal"
            mt="sm"
            {...buttonText("unlimited")}
          />
        </Card>
      </SimpleGrid>
      <Card withBorder mt="md" py="sm">
        <Group align="center" justify="space-between">
          <Group align="center" gap={10}>
            <IconBrandDocker size={20} />
            <Text>
              <Text fw="bold" span>
                New
              </Text>
              : 1-click Docker images for self-hosting. Starting from $199 /
              month.
            </Text>
          </Group>
          <Button
            component="a"
            href="https://lunary.ai/pricing"
            target="_blank"
            variant="gradient"
            color="teal"
            px={20}
            size="xs"
          >
            Pricing
          </Button>
        </Group>
      </Card>
    </>
  )
}

function UpgradeModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{ highlight: string }>) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      analytics.track("Upgrade Modal")
  }, [])

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return null

  return (
    <Container px={80} py="md">
      <Stack align="center" ta="center" className="unblockable">
        <IconAnalyze color={"#206dce"} size={50} />

        <Title order={2} fw={700} size={34} ta="center">
          10x your AI's performance
        </Title>

        <Text size="lg" mt={0} mb="lg" fw={500}>
          {`Remove limits & unlock powerful features to improve your AI's
        quality.`}
        </Text>
      </Stack>
      <UpgradePlans highlight={innerProps?.highlight} />
      <Text ta="center" size="sm" mt="lg">
        Cancel any time with just 1 click. <Mark>30 days</Mark> money-back
        guarantee.
      </Text>
      <Card w="fit-content" mx="auto" mt="md">
        <SocialProof />
      </Card>
    </Container>
  )
}

export function openUpgrade(highlight?: string) {
  modals.openContextModal({
    modal: "upgrade",
    withCloseButton: false,
    size: 900,
    innerProps: {
      highlight,
    },
  })
}

export default UpgradeModal
