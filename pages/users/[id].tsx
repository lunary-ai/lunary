import { useRouter } from "next/router"

import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core"

import SmartViewer from "@/components/Blocks/SmartViewer"

import AgentSummary from "@/components/Blocks/Analytics/AgentSummary"
import UsageSummary from "@/components/Blocks/Analytics/UsageSummary"
import AppUserAvatar from "@/components/Blocks/AppUserAvatar"
import CopyText from "@/components/Blocks/CopyText"
import { useAppUser, useRunsUsage } from "@/utils/dataHooks"
import { formatAppUser } from "@/utils/format"
import { NextSeo } from "next-seo"

export default function UserDetails({}) {
  const router = useRouter()
  const { id } = router.query

  const { user } = useAppUser(id as string)

  const { usage } = id ? useRunsUsage(90, id) : {}

  const { name, email, ...extraProps } = user?.props || {}

  return (
    <Stack>
      <NextSeo title={formatAppUser(user)} />
      <Title order={2}>User Details</Title>
      <Card withBorder w={400}>
        <Group>
          <Stack>
            <Group>
              <AppUserAvatar user={user} />
              <Title order={3}>{formatAppUser(user)}</Title>
            </Group>
            <Group gap={3}>
              <Text>ID:</Text>
              <CopyText value={user?.external_id} />
            </Group>
            {email && (
              <Group gap={3} align="center">
                <Text>Email:</Text>
                <CopyText value={email} />
              </Group>
            )}
            <Group>
              <Text>{`Last seen:  ${new Date(user?.last_seen).toLocaleString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                },
              )}`}</Text>
            </Group>

            {Object.keys(extraProps).length > 0 && (
              <SmartViewer data={extraProps} />
            )}
          </Stack>
        </Group>
      </Card>
      <Title order={2}>Last 3 months usage</Title>
      {usage && (
        <SimpleGrid cols={3} gap="md">
          <UsageSummary usage={usage} />
          <AgentSummary usage={usage} />
        </SimpleGrid>
      )}
    </Stack>
  )
}
