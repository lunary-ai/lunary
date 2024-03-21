import { useRouter } from "next/router"

import { Box, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core"

import SmartViewer from "@/components/SmartViewer"

import AgentSummary from "@/components/analytics/AgentSummary"
import UsageSummary from "@/components/analytics/UsageSummary"
import AppUserAvatar from "@/components/blocks/AppUserAvatar"
import CopyText from "@/components/blocks/CopyText"
import {
  useProjectInfiniteSWR,
  useProjectSWR,
  useRunsUsage,
} from "@/utils/dataHooks"
import {
  costColumn,
  durationColumn,
  feedbackColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  tagsColumn,
  timeColumn,
} from "@/utils/datatable"
import { formatAppUser } from "@/utils/format"
import { NextSeo } from "next-seo"
import DataTable from "@/components/blocks/DataTable"

const columns = [
  timeColumn("createdAt"),
  nameColumn("Name"),
  durationColumn(),
  costColumn(),
  feedbackColumn(),
  tagsColumn(),
  inputColumn("Prompt"),
  outputColumn("Result"),
]

export default function UserDetails({}) {
  const router = useRouter()
  const { id } = router.query as { id: string }

  const { data: user } = useProjectSWR(`/external-users/${id}`)

  const { usage } = useRunsUsage(90, id)

  const { name, email, ...extraProps } = user?.props || ({} as any)

  const {
    data: logs,
    loading,
    validating,
    loadMore,
  } = useProjectInfiniteSWR(`/runs?users=${id}`)

  return (
    <Stack>
      <NextSeo title={formatAppUser(user)} />

      <Card withBorder>
        <Group gap={48}>
          <Group>
            <AppUserAvatar user={user} />
            <Title order={4}>{formatAppUser(user)}</Title>
          </Group>
          <Group gap={3}>
            <Text>ID:</Text>
            <CopyText value={user?.externalId} />
          </Group>
          {email && (
            <Group gap={3}>
              <Text>Email:</Text>
              <CopyText value={email} />
            </Group>
          )}
          <Group>
            {user?.last_seen && (
              <Text c="dimmed">{`last seen:  ${new Date(
                user.last_seen,
              ).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
              })}`}</Text>
            )}
          </Group>

          {Object.keys(extraProps).length > 0 && (
            <SmartViewer data={extraProps} />
          )}
        </Group>
      </Card>
      <Title order={2}>Analytics</Title>
      {usage && (
        <SimpleGrid cols={3} spacing="md">
          <UsageSummary usage={usage} />
          <AgentSummary usage={usage} />
        </SimpleGrid>
      )}

      <Title order={2}>Latest Activity</Title>

      <Box mah={1000}>
        <DataTable
          type="user-details"
          data={logs}
          columns={columns}
          loading={loading || validating}
          loadMore={loadMore}
          onRowClicked={(row) => {
            router.push(`/traces/${row.id}`)
          }}
        />
      </Box>
    </Stack>
  )
}
