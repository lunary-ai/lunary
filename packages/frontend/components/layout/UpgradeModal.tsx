import analytics from "@/utils/analytics"

import { ContextModalProps, modals } from "@mantine/modals"
import {
  IconAnalyze,
  IconArrowDown,
  IconArrowUp,
  IconBrandDocker,
  IconCheck,
  IconCircleCheck,
  IconCross,
  IconInfoCircle,
} from "@tabler/icons-react"

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Highlight,
  List,
  Mark,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core"

import { useCallback, useEffect, useState } from "react"
import SocialProof from "../blocks/SocialProof"
import errorHandler from "@/utils/errors"
import { notifications } from "@mantine/notifications"
import { capitalize } from "@/utils/format"
import { useOrg } from "@/utils/dataHooks"
import { fetcher } from "@/utils/fetcher"
import { FEATURES } from "@/utils/features"
import { theme } from "@/utils/theme"

function PlanFeature({ title, id, highlight, Icon, description }) {
  return (
    <Group align="center" gap={8} wrap="no-wrap">
      <Icon size={16} opacity={0.8} />
      <Text size="sm">
        <Highlight highlight={highlight === id ? title : ""}>{title}</Highlight>
      </Text>
      {description && (
        <Tooltip label={description}>
          <IconInfoCircle size={16} />
        </Tooltip>
      )}
    </Group>
  )
}

function RenderPrice({ price, period }) {
  // year = 2 months free
  const discount = period === "yearly" ? 2 / 12 : 0
  const isString = typeof price === "string"
  const monthlyPrice = isString
    ? price
    : `$${Math.floor(price * (1 - discount))}`

  return (
    <>
      <Group align="center" gap={8}>
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
          {monthlyPrice}
        </Title>
        {!isString && (
          <Text span fz={16} c="dimmed" mt={7}>
            {` / user / month`}
          </Text>
        )}
      </Group>
    </>
  )
}

function AcceptedPayments() {
  return (
    <Group align="center" gap={11}>
      <img height={24} src="/assets/google-pay.webp" alt="google pay" />
      <img height={24} src="/assets/apple-pay.webp" alt="apple pay" />
      <img height={24} src="/assets/accepted-cards.webp" alt="Accepted cards" />
    </Group>
  )
}

function RenderPlanCard({
  planId,
  price,
  onClick,
  variant,
  onlyCTA,
  description,
  mostPopular,
  color,
  loading,
}: {
  planId: string
  price: string | number
  onClick: (plan: string) => void
  variant: string
  mostPopular?: boolean
  description: string
  color?: string
  loading?: boolean
  onlyCTA?: boolean
}) {
  const { org } = useOrg()

  const { plan } = org

  const buttonText = useCallback(() => {
    if (planId === "scale") return { children: "Get a Quote", variant }

    if (org?.canceled && planId === plan)
      return { children: "Reactivate", variant }

    if (org?.canceled)
      return {
        children: `Reactivate on ${capitalize(planId)}`,
        variant,
      }

    // Switch to yearly
    // if (newPlan === plan && period !== org?.planPeriod)
    //   return { children: "Switch to " + period, variant: "outline" }

    if (planId === plan) return { children: "Current plan", disabled: true }

    if (planId === "free" && plan !== "free") {
      return null
    }

    // if (newPlan === "pro" && plan === "unlimited")
    // return { children: "Downgrade", variant: "subtle" }

    if (planId === "team" && plan !== "free")
      return { children: "Switch to Team", variant }

    return { children: "Upgrade", variant }
  }, [org, plan])

  const CTA = buttonText() ? (
    <Button
      size="md"
      onClick={() => onClick(plan)}
      fullWidth
      loading={loading}
      gradient={{ from: "violet", to: "blue", deg: 45 }}
      color="violet"
      mt="auto"
      {...buttonText()}
    />
  ) : null

  if (onlyCTA) return CTA

  return (
    <Stack justify="space-between" h="100%">
      <Stack>
        <Group>
          <Text
            tt="uppercase"
            fw="bold"
            variant={variant}
            c={color}
            gradient={{ from: "indigo", to: "cyan", deg: 45 }}
          >
            {capitalize(planId)}
          </Text>
          {/* {plan === planId && (
            <Text size="lg" c="dimmed" ta="center" opacity={0.7}>
              (current plan)
            </Text>
          )} */}
        </Group>
        <Text size="md" fw={500} opacity={0.6}>
          {description}
        </Text>
        <RenderPrice price={price} period="monthly" />

        {mostPopular && planId !== plan && (
          <Badge
            tt="none"
            size="md"
            pl={3}
            leftSection={<IconCircleCheck size={16} />}
            color="violet"
            variant="light"
          >
            Most popular
          </Badge>
        )}
      </Stack>
      {CTA}
    </Stack>
  )
}

function FeaturePlanValue({ data }) {
  const { value, help } = data || {}

  return (
    <Stack gap={5} align="center">
      {value === true ? (
        <IconCheck color={theme.colors.green[5]} size={22} />
      ) : value === false ? (
        <IconCross size={22} />
      ) : (
        <Text>{value}</Text>
      )}

      {help && (
        <Text c="dimmed" size="sm">
          {help}
        </Text>
      )}
    </Stack>
  )
}

export function UpgradePlans({
  highlight,
  defaultExpand,
}: {
  highlight?: string
  defaultExpand?: boolean
}) {
  const { org } = useOrg()
  const [period, setPeriod] = useState("monthly")
  const [loading, setLoading] = useState(null)

  const [showFeatures, setShowFeatures] = useState(defaultExpand)

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

  return (
    <>
      <Table verticalSpacing="md" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            {showFeatures && <Table.Th w={200}></Table.Th>}
            <Table.Th h={200} w={200}>
              <Card
                h="100%"
                withBorder={!showFeatures}
                shadow={!showFeatures ? "sm" : null}
              >
                <RenderPlanCard
                  planId="free"
                  variant="outline"
                  color="teal"
                  price={`Free`}
                  description="Basic features to build your LLM app."
                  onClick={() => upgradePlan("free")}
                  loading={loading === "free"}
                />
              </Card>
            </Table.Th>
            <Table.Th h={200} w={200}>
              <Card
                h="100%"
                withBorder={!showFeatures}
                shadow={!showFeatures ? "sm" : null}
              >
                <RenderPlanCard
                  planId="team"
                  variant="gradient"
                  mostPopular
                  description="Go to production with advanced features."
                  price={20}
                  onClick={() => upgradePlan("team")}
                  loading={loading === "team"}
                />
              </Card>
            </Table.Th>
            <Table.Th h={200} w={200}>
              <Card
                h="100%"
                withBorder={!showFeatures}
                shadow={!showFeatures ? "sm" : null}
              >
                <RenderPlanCard
                  planId="scale"
                  variant="default"
                  color="dark"
                  description="Custom plans for your team's exact needs."
                  price={"Custom"}
                  onClick={() => window.open("https://lunary.ai/schedule")}
                  loading={loading === "scale"}
                />
              </Card>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        {showFeatures && (
          <Table.Tbody>
            {FEATURES.map((feature) => (
              <Table.Tr key={feature.id}>
                <Table.Td maw={200}>
                  <PlanFeature
                    title={feature.title}
                    id={feature.id}
                    highlight={highlight}
                    Icon={feature.Icon}
                    description={feature.description}
                  />
                </Table.Td>

                {["free", "team", "enterprise"].map((plan) => (
                  <Table.Td align="center" key={plan}>
                    <FeaturePlanValue
                      data={feature.plans.find((p) => p.id === plan)}
                    />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}

            <Table.Tr>
              <Table.Td></Table.Td>
              <Table.Td>
                <RenderPlanCard
                  planId="free"
                  onlyCTA
                  variant="outline"
                  color="teal"
                  price={`Free  `}
                  onClick={() => upgradePlan("free")}
                  loading={loading === "free"}
                />
              </Table.Td>
              <Table.Td>
                <RenderPlanCard
                  planId="team"
                  variant="gradient"
                  mostPopular
                  onlyCTA
                  onClick={() => upgradePlan("team")}
                  loading={loading === "free"}
                />
              </Table.Td>
              <Table.Td>
                <RenderPlanCard
                  planId="enterprise"
                  variant="default"
                  onlyCTA
                  color="dark"
                  onClick={() => window.open("https://lunary.ai/schedule")}
                  loading={loading === "enterprise"}
                />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        )}
      </Table>
      {!showFeatures ? (
        <Group w="100%" justify="center" align="center">
          <Button
            variant="default"
            my="md"
            size="xs"
            mx="auto"
            onClick={() => setShowFeatures(true)}
            leftSection={<IconArrowDown size={12} />}
          >
            View Features
          </Button>
        </Group>
      ) : (
        <Group w="100%" justify="center" align="center">
          <Button
            variant="subtle"
            onClick={() => setShowFeatures(false)}
            leftSection={<IconArrowUp size={12} />}
          >
            Collapse features
          </Button>
        </Group>
      )}
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

  const { org } = useOrg()

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return null

  return (
    <Container px={0} pb="md" size="xl">
      {/* <Stack align="center" ta="center" className="unblockable"> */}
      {/* <IconAnalyze color={"#206dce"} size={50} /> */}

      {/* <Title order={2} fw={700} size={34} ta="center">
          10x your AI's performance
        </Title>

        <Text size="lg" mt={0} mb="lg" fw={500}>
          {`Unlock powerful features to improve your AI's
        quality.`}
        </Text> */}
      {/* </Stack> */}
      {/* <Divider my="xl" /> */}
      <UpgradePlans highlight={innerProps?.highlight} defaultExpand />
      <Text ta="center" size="md" mt="lg">
        <Mark>30 days</Mark> money-back guarantee. Cancel any time with just 1
        click.
      </Text>
      <Group justify="space-between" align="center" w="100%" px="sm" mt="md">
        <Card w="fit-content">
          <SocialProof />
        </Card>
        {org?.plan === "free" && <AcceptedPayments />}
      </Group>
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
