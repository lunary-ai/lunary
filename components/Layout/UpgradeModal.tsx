import analytics from "@/utils/analytics"

import { ContextModalProps } from "@mantine/modals"
import { IconAnalyze, IconCircleCheck } from "@tabler/icons-react"

import {
  Badge,
  Button,
  Card,
  Group,
  List,
  Mark,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core"

import { useEffect } from "react"
import { useTeam } from "@/utils/supabaseHooks"

export const UpgradeBody = () => {
  const { team } = useTeam()

  return (
    <>
      <Stack align="center" ta="center" className="unblockable">
        <IconAnalyze color={"#206dce"} size={60} />
        <Title order={2} weight={700} size={40} ta="center">
          Upgrade your plan
        </Title>

        {/* <Text size="xl" mt="xs" weight={500}>
          Upgrade now and secure{" "}
          <Mark>{` the lowest price we'll ever offer. `}</Mark>
        </Text> */}
        <Text size="lg" mt="xs" mb="xl" weight={500}>
          Unlock higher usage and team access, support development, and get
          involved in the future of the product.
        </Text>
      </Stack>

      <SimpleGrid
        cols={2}
        breakpoints={[{ maxWidth: "sm", cols: 1, spacing: "sm" }]}
        spacing="md"
      >
        <Card p="xl" withBorder shadow="md">
          <Group spacing={6}>
            <Text
              transform="uppercase"
              weight="bold"
              variant="gradient"
              gradient={{ from: "indigo", to: "cyan", deg: 45 }}
            >
              Pro
            </Text>
            <Badge variant="outline">-50%</Badge>
          </Group>

          <Group my={20} align="center" spacing={10}>
            <Title order={3} size={30}>
              <Text span td="line-through" size={20}>
                $50
              </Text>
              {` $25`}
              <Text span size={20}>
                {` / mo`}
              </Text>
            </Title>
          </Group>
          <List
            spacing="sm"
            size="sm"
            center
            icon={
              <ThemeIcon color="teal" size={24} radius="xl">
                <IconCircleCheck size={16} />
              </ThemeIcon>
            }
          >
            <List.Item>5k events per day</List.Item>
            <List.Item>Invite 4 team members</List.Item>
            <List.Item>Export data</List.Item>
            <List.Item>Advanced Analytics</List.Item>
          </List>

          <Button
            size="md"
            href={`${process.env.NEXT_PUBLIC_STRIPE_PRO_LINK}&client_reference_id=${team?.id}`}
            fullWidth
            component="a"
            variant="gradient"
            gradient={{ from: "violet", to: "blue", deg: 45 }}
            color="violet"
            mt={40}
          >
            Claim -50% forever
          </Button>
        </Card>
        <Card p="xl" withBorder>
          <Group spacing={6}>
            <Text
              transform="uppercase"
              weight="bold"
              variant="gradient"
              gradient={{ from: "teal", to: "lime", deg: 45 }}
            >
              Unlimited
            </Text>
          </Group>

          <Group my={20} align="center" spacing={10}>
            <Title order={3} size={30}>
              {` $95`}
              <Text span size={20}>
                {` / mo`}
              </Text>
            </Title>
          </Group>
          <List
            spacing="sm"
            size="sm"
            center
            icon={
              <ThemeIcon color="teal" size={24} radius="xl">
                <IconCircleCheck size={16} />
              </ThemeIcon>
            }
          >
            <List.Item>20k events per day</List.Item>
            <List.Item>10 team members</List.Item>
            <List.Item>API access</List.Item>
            <List.Item>Early access to new features</List.Item>
          </List>

          <Button
            size="md"
            component="a"
            href={`${process.env.NEXT_PUBLIC_STRIPE_PRO_LINK}&client_reference_id=${team?.id}`}
            target="_blank"
            fullWidth
            variant="outline"
            color="teal"
            // gradient={{ from: "teal", to: "lime", deg: 25 }}
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
    </>
  )
}

const UpgradeModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<{ modalBody: string }>) => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return null

  useEffect(() => {
    analytics.track("Upgrade Modal")
  }, [])

  return (
    <Stack p={60} pt={0}>
      <UpgradeBody />
    </Stack>
  )
}

export default UpgradeModal
