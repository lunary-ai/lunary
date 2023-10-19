import DataTable from "@/components/Blocks/DataTable"

import { useAppUsers } from "@/utils/supabaseHooks"
import { Group, Stack, Text, Title } from "@mantine/core"

import { costColumn, timeColumn } from "@/utils/datatable"

import Router from "next/router"
import AppUserAvatar from "@/components/Blocks/AppUserAvatar"
import { formatAppUser } from "@/utils/format"
import Empty from "@/components/Layout/Empty"
import { IconUsers } from "@tabler/icons-react"
import { NextSeo } from "next-seo"

const columns = [
  {
    header: "User",
    size: 80,
    id: "users",
    enableHiding: false,
    cell: (props) => {
      const user = props.row.original
      return (
        <Group spacing={8}>
          <AppUserAvatar size={40} user={user} />
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
  const { usersWithUsage, loading } = useAppUsers()

  if (!loading && usersWithUsage.length === 0) {
    return <Empty Icon={IconUsers} what="users" />
  }

  return (
    <Stack>
      <NextSeo title="Users" />
      <Title>Users</Title>
      <DataTable
        columns={columns}
        data={usersWithUsage}
        onRowClicked={(row) => Router.push(`/users/${row.id}`)}
      />
    </Stack>
  )
}
