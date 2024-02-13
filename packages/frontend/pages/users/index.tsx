import DataTable from "@/components/Blocks/DataTable"

import { Group, Stack, Text } from "@mantine/core"

import { costColumn, timeColumn } from "@/utils/datatable"

import AppUserAvatar from "@/components/Blocks/AppUserAvatar"
import Empty from "@/components/Layout/Empty"
import { formatAppUser } from "@/utils/format"
import { IconUsers } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"
import analytics from "../../utils/analytics"
import { useAppUserList } from "@/utils/dataHooks"

const columns = [
  {
    header: "User",
    size: 80,
    id: "props",
    cell: (props) => {
      const user = props.row.original

      return (
        <Group gap={8}>
          <AppUserAvatar size={30} user={user} />
          <Text fw={500}>{formatAppUser(user)}</Text>
        </Group>
      )
    },
  },
  timeColumn("createdAt", "First Seen"),
  timeColumn("lastSeen", "Last Seen"),
  costColumn(),
]

export default function Users() {
  const { users, isLoading, isValidating } = useAppUserList()

  return (
    <Empty
      enable={!isLoading && users && users.length === 0}
      Icon={IconUsers}
      title="Find out who your users are"
      description="Users you identify from the SDKs will appear here."
      features={["See who costs you the most", "View actions taken by users"]}
    >
      <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
        <NextSeo title="Users" />

        <DataTable
          type="users"
          columns={columns}
          data={users}
          onRowClicked={(row) => {
            analytics.trackOnce("OpenUser")

            Router.push(`/users/${row.id}`)
          }}
          loading={isLoading || isValidating}
          defaultSortBy="cost"
        />
      </Stack>
    </Empty>
  )
}
