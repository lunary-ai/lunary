import DataTable from "@/components/blocks/DataTable"

import { Group, Stack, Text } from "@mantine/core"

import { costColumn, timeColumn } from "@/utils/datatable"

import AppUserAvatar from "@/components/blocks/AppUserAvatar"
import SearchBar from "@/components/blocks/SearchBar"
import Empty from "@/components/layout/Empty"
import { useExternalUsers } from "@/utils/dataHooks/external-users"
import { formatAppUser } from "@/utils/format"
import { useDebouncedValue } from "@mantine/hooks"
import { IconUsers } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import Router from "next/router"
import { useState } from "react"
import analytics from "../../utils/analytics"

const columns = [
  {
    header: "User",
    size: 80,
    id: "props",
    cell: (props) => {
      const user = props.row.original

      return (
        <Group gap={8} wrap="nowrap">
          <AppUserAvatar size={30} user={user} />
          <Text
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            size="sm"
            fw={500}
          >
            {formatAppUser(user)}
          </Text>
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

  const { users, loading, validating, loadMore } = useExternalUsers({
    search: debouncedSearch,
  })

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
