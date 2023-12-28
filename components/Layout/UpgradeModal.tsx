import analytics from "@/utils/analytics"

import { ContextModalProps, modals } from "@mantine/modals"
import { IconAnalyze, IconCheck, IconCircleCheck } from "@tabler/icons-react"

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
import { useProfile } from "../../utils/dataHooks"
import SocialProof from "../Blocks/SocialProof"
import errorHandler from "@/utils/errorHandler"
import { notifications } from "@mantine/notifications"
import { capitalize } from "@/utils/format"

const PlanFeatures = ({ features, highlight }) => {
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

const RenderPrice = ({ price, period }) => {
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

export const UpgradePlans = ({ highlight }: { highlight?: string }) => {
  const { profile } = useProfile()
  const [period, setPeriod] = useState("monthly")
  const [loading, setLoading] = useState(null)

  const plan = profile?.org?.plan || "free"

  const upgradePlan = async (plan) => {
    setLoading(plan)

    const res = await errorHandler(
      fetch("/api/user/upgrade", {
        method: "POST",
        body: JSON.stringify({
          plan,
          period,
          orgId: profile?.org?.id,
          origin: window.location.origin,
        }),
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
      if (profile?.org.canceled && newPlan === plan)
        return { children: "Reactivate", variant: "gradient" }

      if (profile?.org.canceled)
        return {
          children: `Reactivate on ${capitalize(newPlan)}`,
          variant: "gradient",
        }

      if (newPlan === plan && period !== profile?.org?.plan_period)
        return { children: "Switch to " + period, variant: "outline" }

      if (newPlan === plan) return { children: "Current plan", disabled: true }

      if (newPlan === "pro" && plan === "unlimited")
        return { children: "Downgrade", variant: "subtle" }

      return { children: "Upgrade", variant: "gradient" }
    },
    [period, profile?.org, period],
  )

  return (
    <>
      <SegmentedControl
        w={"fit-content"}
        mx="auto"
        display="flex"
        mb="lg"
        value={period}
        onChange={setPeriod}
        data={[
          { label: "Monthly", value: "monthly" },
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
        ]}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card p="xl" withBorder shadow="md">
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
                { id: "apps", title: "Unlimited Projects" },
                { id: "analytics", title: "Advanced Analytics" },
                { id: "playground", title: "Prompt Playground" },
                { id: "export", title: "Exports & API" },
              ]}
              highlight={highlight}
            />

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

        <Card p="xl" withBorder>
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

          <Group my={20} align="center" gap={10}>
            <RenderPrice price={120} period={period} />
          </Group>

          <Text mb="xs" size="sm" mt={-10}>
            Everything in Pro, plus:
          </Text>

          <PlanFeatures
            features={[
              { id: "events", title: "Unlimited events" },
              { id: "team", title: "10 team members" },
              { id: "template", title: "Unlimited Templates" },
              { id: "playground", title: "Unlimited Playground" },
              { id: "evaluate", title: "Evaluations & Alerts" },
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
            mt="auto"
            {...buttonText("unlimited")}
          />
        </Card>
      </SimpleGrid>
    </>
  )
}

const UpgradeModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<{ highlight: string }>) => {
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
          Upgrade your plan
        </Title>

        <Text size="lg" mt="xs" mb="lg" fw={500}>
          {`Remove limits & unlock powerful features to improve your AI's
        quality.`}
        </Text>
      </Stack>
      <UpgradePlans highlight={innerProps?.highlight} />
      <Text ta="center" size="sm" mt="lg">
        Cancel your subscription at any time with just 1 click.{" "}
        <Mark>30 days</Mark> money-back guarantee.
      </Text>
      <Card w="fit-content" mx="auto" mt="md">
        <SocialProof />
      </Card>
    </Container>
  )
}

export const openUpgrade = (highlight?: string) => {
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
