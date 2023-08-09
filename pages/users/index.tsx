import DataTable from "@/components/Blocks/DataTable"

import { useAppUsers } from "@/utils/supabaseHooks"
import { Stack, Title } from "@mantine/core"

import { costColumn, timeColumn } from "@/utils/datatable"
import { createColumnHelper } from "@tanstack/react-table"

import Router from "next/router"

const columnHelper = createColumnHelper<any>()

const columns = [
  columnHelper.accessor("external_id", {
    header: "ID",
    size: 80,
  }),
  timeColumn("created_at", "First Seen"),
  timeColumn("last_seen", "Last Seen"),
  costColumn(),
]

export default function Users() {
  const { usersWithUsage } = useAppUsers()

  return (
    <Stack>
      <Title>Users</Title>
      <DataTable
        columns={columns}
        data={usersWithUsage}
        onRowClicked={(row) => Router.push(`/users/${row.id}`)}
      />
    </Stack>
  )
}
