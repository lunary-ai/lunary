import DataTable from "@/components/blocks/DataTable"

import { Group, Stack, Text } from "@mantine/core"

import { costColumn, timeColumn } from "@/utils/datatable"

import AppUserAvatar from "@/components/blocks/AppUserAvatar"
import Empty from "@/components/layout/Empty"
import { formatAppUser } from "@/utils/format"
import { IconUsers } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"
import analytics from "../../utils/analytics"
import { useAppUserList, useProjectInfiniteSWR } from "@/utils/dataHooks"
import SearchBar from "@/components/blocks/SearchBar"
import { useState } from "react"
import { useDebouncedValue } from "@mantine/hooks"

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
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebouncedValue(search, 200)

  const {
    data: users,
    loading,
    validating,
    loadMore,
  } = useProjectInfiniteSWR(
    `/external-users${debouncedSearch ? `?search=${debouncedSearch}` : ""}`,
  )

  return (
    <Empty
      enable={!loading && users && users.length === 0 && !debouncedSearch}
      Icon={IconUsers}
      title="Find out who your users are"
      description="Users you identify from the SDKs will appear here."
      features={["See who costs you the most", "View actions taken by users"]}
    >
      <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
        <NextSeo title="Users" />
        <SearchBar query={search} setQuery={setSearch} />
        <DataTable
          type="users"
          columns={columns}
          data={users}
          onRowClicked={(row) => {
            analytics.trackOnce("OpenUser")

            Router.push(`/users/${row.id}`)
          }}
          loading={loading || validating}
          loadMore={loadMore}
          defaultSortBy="cost"
        />
      </Stack>
    </Empty>
  )
}
