import DataTable from "@/components/Blocks/DataTable"

import { useUsers } from "@/utils/supabaseHooks"
import { Stack, Title } from "@mantine/core"

import { createColumnHelper } from "@tanstack/react-table"

const columnHelper = createColumnHelper<any>()

const columns = [
  columnHelper.accessor("external_id", {
    header: "ID",
    size: 80,
    // cell: (props) => <Badge color="blue">{props.getValue()}</Badge>,
  }),
  columnHelper.accessor("created_at", {
    header: "First Seen",
    id: "created_at",
    size: 60,
    enableResizing: false,
    sortingFn: (a, b) =>
      new Date(a.getValue("created_at")).getTime() -
      new Date(b.getValue("created_at")).getTime(),
    cell: (info) => new Date(info.getValue()).toLocaleTimeString(),
  }),
  columnHelper.accessor("last_seen", {
    header: "Last Seen",
    id: "last_seen",
    size: 60,
    enableResizing: false,
    sortingFn: (a, b) =>
      new Date(a.getValue("last_seen")).getTime() -
      new Date(b.getValue("last_seen")).getTime(),
    cell: (info) => new Date(info.getValue()).toLocaleTimeString(),
  }),
]

export default function Users() {
  const { users } = useUsers()

  return (
    <Stack>
      <Title>Users</Title>
      <DataTable columns={columns} data={users} />
    </Stack>
  )
}
