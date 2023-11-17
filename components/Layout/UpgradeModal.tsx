import analytics from "@/utils/analytics"

import { ContextModalProps } from "@mantine/modals"
import { IconAnalyze, IconCircleCheck } from "@tabler/icons-react"

import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Highlight,
  List,
  Mark,
  Rating,
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
    <>
      <Stack align="center" ta="center" className="unblockable">
        <IconAnalyze color={"#206dce"} size={50} />
        <Title order={2} fw={700} size={40} ta="center">
          Upgrade your plan
        </Title>

        {/* <Text size="xl" mt="xs" fw={500}>
          Upgrade now and secure{" "}
          <Mark>{` the lowest price we'll ever offer. `}</Mark>
        </Text> */}
        <Text size="lg" mt="xs" mb="xl" fw={500}>
          Unlock higher usage & powerful features to improve your AI`&apos;s
          quality.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card p="xl" withBorder shadow="md">
          <Group gap={6}>
            <Text
              tt="uppercase"
              fw="bold"
              variant="gradient"
              gradient={{ from: "indigo", to: "cyan", deg: 45 }}
            >
              Pro
            </Text>
            {isFree && <Badge variant="outline">-50%</Badge>}
            {isPro && (
              <Text size="lg" color="dimmed" ta="center">
                (current plan)
              </Text>
            )}
          </Group>

          <Group my={20} align="center" gap={10}>
            <Title order={3} size={30}>
              {isFree && (
                <Text span td="line-through" size="20">
                  $50
                </Text>
              )}
              {` $25`}
              <Text span size="20">
                {` / mo`}
              </Text>
            </Title>
          </Group>

          <PlanFeatures
            features={[
              { id: "events", title: "4k events per day" },
              { id: "team", title: "4 team members" },
              { id: "team", title: "3 apps" },
              { id: "analytics", title: "Advanced Analytics" },
              { id: "play", title: "AI Playground" },
              { id: "export", title: "Export data" },
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
              mt={40}
            >
              Claim -50% forever
            </Button>
          )}
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
            <Title order={3} size={30}>
              {` $95`}
              <Text span size="20">
                {` / mo`}
              </Text>
            </Title>
          </Group>

          <Text mb="xs" size="sm" mt={-10}>
            Everything in Pro, plus:
          </Text>

          <PlanFeatures
            features={[
              { id: "events", title: "20k events per day" },
              { id: "team", title: "10 team members" },
              { id: "team", title: "Unlimited apps" },
              { id: "play", title: "Unlimited AI Playground" },
              { id: "evaluation", title: "Tests & Evaluations" },
              { id: "api", title: "API access" },
            ]}
            highlight={highlight}
          />

          <Button
            size="md"
            component="a"
            href={`${process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_LINK}&client_reference_id=${profile.org?.id}`}
            target="_blank"
            fullWidth
            variant="outline"
            color="teal"
            mt={40}
          >
            Upgrade now
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
    <Stack p={60} pt={0}>
      <UpgradeBody highlight={innerProps?.highlight} />
    </Stack>
  )
}

export default UpgradeModal
