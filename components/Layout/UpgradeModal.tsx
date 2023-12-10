import analytics from "@/utils/analytics"

import { ContextModalProps, modals } from "@mantine/modals"
import { IconAnalyze, IconCircleCheck } from "@tabler/icons-react"

import {
  Button,
  Card,
  Container,
  Group,
  Highlight,
  List,
  Mark,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core"

import { useEffect } from "react"
import { useProfile } from "../../utils/dataHooks"
import SocialProof from "../Blocks/SocialProof"

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

export const UpgradeBody = ({ highlight }) => {
  const { profile } = useProfile()

  const isFree = profile?.org.plan === "free"
  const isPro = profile?.org.plan === "pro"

  return (
    <Container px={80} py="md">
      <Stack align="center" ta="center" className="unblockable">
        <IconAnalyze color={"#206dce"} size={50} />

        <Title order={2} fw={700} size={34} ta="center">
          Upgrade your plan
        </Title>

        <Text size="lg" mt="xs" mb="xl" fw={500}>
          Remove limits & unlock powerful features to improve your AI&apos;s
          quality.
        </Text>
      </Stack>

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
              {isPro && (
                <Text size="lg" c="dimmed" ta="center">
                  (current plan)
                </Text>
              )}
            </Group>

            <Title order={2}>
              {isFree && (
                <Text span td="line-through" style={{ fontSize: 20 }} fw={700}>
                  $50
                </Text>
              )}
              {` $25`}
              <Text span>{` / mo`}</Text>
            </Title>

            <PlanFeatures
              features={[
                { id: "events", title: "4k events per day" },
                { id: "team", title: "4 team members" },
                { id: "apps", title: "Unlimited Apps" },
                { id: "analytics", title: "Advanced Analytics" },
                { id: "playground", title: "Prompt Playground" },
                { id: "export", title: "Exports & API" },
              ]}
              highlight={highlight}
            />

            {isFree && (
              <Button
                size="md"
                href={`${process.env.NEXT_PUBLIC_STRIPE_PRO_LINK}&client_reference_id=${profile?.org.id}`}
                fullWidth
                component="a"
                variant="gradient"
                gradient={{ from: "violet", to: "blue", deg: 45 }}
                color="violet"
                mt="auto"
              >
                Claim -50% forever
              </Button>
            )}
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
          </Group>

          <Group my={20} align="center" gap={10}>
            <Title order={2}>
              {` $95`}
              <Text span>{` / mo`}</Text>
            </Title>
          </Group>

          <Text mb="xs" size="sm" mt={-10}>
            Everything in Pro, plus:
          </Text>

          <PlanFeatures
            features={[
              { id: "events", title: "Unlimited events" },
              { id: "team", title: "10 team members" },
              { id: "template", title: "Prompt Templates" },
              { id: "playground", title: "Unlimited Playground" },
              { id: "evaluate", title: "Evaluations & Alerts" },
            ]}
            highlight={highlight}
          />

          <Button
            size="md"
            component="a"
            href={`${process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_LINK}&client_reference_id=${profile.org?.id}`}
            target="_blank"
            fullWidth
            variant="gradient"
            gradient={{ from: "teal", to: "lime", deg: 45 }}
            color="teal"
            mt="auto"
          >
            Upgrade Now
          </Button>
        </Card>
      </SimpleGrid>
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

  return <UpgradeBody highlight={innerProps?.highlight} />
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
