import { useRouter } from "next/router"

import {
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core"

import SmartViewer from "@/components/SmartViewer"

import TopModelsCard from "@/components/analytics/TopModels"
import AppUserAvatar from "@/components/blocks/AppUserAvatar"
import CopyText from "@/components/blocks/CopyText"
import DataTable from "@/components/blocks/DataTable"
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
import { fetcher } from "@/utils/fetcher"
import { formatAppUser } from "@/utils/format"
import { modals } from "@mantine/modals"
import { notifications } from "@mantine/notifications"
import { IconCheck, IconTrash } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useTopModels } from "@/utils/dataHooks/analytics"

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

  const { data: topModels, isLoading: topModelsLoading } = useTopModels({
    userId: id,
  })

  const { name, email, ...extraProps } = user?.props || ({} as any)

  const {
    data: logs,
    loading,
    validating,
    loadMore,
  } = useProjectInfiniteSWR(`/runs?users=${id}`)

  function confirmDelete() {
    modals.openConfirmModal({
      title: "Please confirm your action",
      confirmProps: { color: "red", "data-testid": "confirm" },
      children: (
        <Text size="sm">
          Are you sure you want to delete this user data? This action cannot be
          undone and all the user data and logs will be lost forever.
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      onConfirm: async () => {
        const notifId = notifications.show({
          loading: true,
          title: "Deleting user data",
          message: "Your user data is being deleted",
          autoClose: false,
          withCloseButton: false,
        })

        await fetcher.delete(`/external-users/${id}`)

        notifications.update({
          id: notifId,
          color: "teal",
          title: "Data removed",
          message: "User data and logs have been successfully removed.",
          icon: <IconCheck size={18} />,
          loading: false,
          autoClose: 2000,
        })

        router.push("/users")
      },
    })
  }

  return (
    <Stack>
      <NextSeo title={formatAppUser(user)} />

      <Card withBorder>
        <Group justify="space-between" align="center">
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
          <Button
            leftSection={<IconTrash size={14} />}
            size="xs"
            color="red"
            variant="light"
            onClick={() => {
              confirmDelete()
            }}
          >
            Remove Data
          </Button>
        </Group>
      </Card>

      {topModels && (
        <SimpleGrid cols={3} spacing="md">
          <TopModelsCard topModels={topModels} isLoading={topModelsLoading} />
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
