import DataTable from "@/components/Blocks/DataTable"

import { useAppUsersList } from "@/utils/dataHooks"
import { Group, Stack, Text } from "@mantine/core"

import { costColumn, timeColumn } from "@/utils/datatable"

import AppUserAvatar from "@/components/Blocks/AppUserAvatar"
import Empty from "@/components/Layout/Empty"
import { formatAppUser } from "@/utils/format"
import { IconUsers } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"
import analytics from "@/utils/analytics"

const columns = [
  {
    header: "User",
    size: 80,
    id: "users",
    cell: (props) => {
      const user = props.row.original
      return (
        <Group spacing={8}>
          <AppUserAvatar size={30} user={user} />
          <Text weight={500}>{formatAppUser(user)}</Text>
        </Group>
      )
    },
  },
  timeColumn("created_at", "First Seen"),
  timeColumn("last_seen", "Last Seen"),
  costColumn(),
]

export default function Users() {
  const { users, loading, loadMore, validating } = useAppUsersList()

  if (!loading && users.length === 0) {
    return <Empty Icon={IconUsers} what="users" />
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-size))"}>
      <NextSeo title="Users" />

      <DataTable
        key="users"
        columns={columns}
        data={users}
        onRowClicked={(row) => {
          analytics.track("OpenUser")

          Router.push(`/users/${row.id}`)
        }}
        loading={loading || validating}
        loadMore={loadMore}
      />
    </Stack>
  )
}
