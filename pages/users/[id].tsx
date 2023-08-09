import { useMemo } from "react"
import { useRouter } from "next/router"

import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core"

import TokensBadge from "@/components/Blocks/TokensBadge"
import SmartViewer from "@/components/Blocks/SmartViewer"

import { useAppUser, useRunsUsage } from "@/utils/supabaseHooks"
import AnalyticsCard from "@/components/Blocks/Analytics/AnalyticsCard"
import BarList from "@/components/Blocks/Analytics/BarList"
import UsageAnalytics from "@/components/Blocks/Analytics/UsageSummary"
import AgentSummary from "@/components/Blocks/Analytics/AgentSummary"
import UsageSummary from "@/components/Blocks/Analytics/UsageSummary"

export default function UserDetails({}) {
  const router = useRouter()
  const { id } = router.query

  const { user } = useAppUser(id as string)

  const { usage } = useRunsUsage(90, id && parseInt(id as string))

  const totalTokens = useMemo(
    () =>
      usage?.reduce(
        (acc, cur) => acc + cur.completion_tokens + cur.prompt_tokens,
        0
      ),
    [usage]
  )

  return (
    <Stack>
      <Card withBorder>
        <Group>
          <Stack>
            <Title order={2}>{user?.external_id}</Title>
            <Group>
              <Text>{`Last seen:  ${new Date(user?.last_seen).toLocaleString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                }
              )}`}</Text>
            </Group>
            <Group>
              <Text>Last 3 month usage: </Text>
              <TokensBadge tokens={totalTokens} />
            </Group>
          </Stack>
          {user?.props && <SmartViewer data={user.props} />}
        </Group>
      </Card>

      {usage && (
        <SimpleGrid cols={3} spacing="md">
          <UsageSummary usage={usage} />
          <AgentSummary usage={usage} />
        </SimpleGrid>
      )}
    </Stack>
  )
}
