import ChatMessage from "@/components/ChatMessage"
import DataTable from "@/components/DataTable"
import { Database } from "@/utils/supaTypes"
import { useGenerations } from "@/utils/supabaseHooks"
import { Badge, Stack, Title } from "@mantine/core"

import { createColumnHelper, ColumnDef } from "@tanstack/react-table"

const columnHelper = createColumnHelper<any>()

const getLastMessage = (messages) => {
  if (Array.isArray(messages)) {
    return messages[messages.length - 1]
  }

  return messages
}

const columns = [
  columnHelper.accessor("created_at", {
    header: "Time",
    sortingFn: (a, b) =>
      new Date(a.getValue("created_at")).getTime() -
      new Date(b.getValue("created_at")).getTime(),
    cell: (info) => new Date(info.getValue()).toLocaleTimeString(),
  }),
  columnHelper.accessor("model", {
    header: "Model",
    cell: (props) => <Badge color="blue">{props.getValue()}</Badge>,
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (props) => (
      <Badge color={props.getValue() === "success" ? "green" : "red"}>
        {props.getValue()}
      </Badge>
    ),
  }),
  {
    id: "duration",
    header: "Duration",
    cell: (props) => {
      if (!props.getValue()) return null
      return `${(props.getValue() / 1000).toFixed(2)}s`
    },
    accessorFn: (row) => {
      if (!row.ended_at) {
        return NaN
      }

      const duration =
        new Date(row.ended_at).getTime() - new Date(row.created_at).getTime()
      return duration
    },
  },
  {
    header: "Tokens",
    id: "tokens",
    sortingFn: (a, b) =>
      a.original.completion_tokens +
      a.original.prompt_tokens -
      (b.original.completion_tokens + b.original.prompt_tokens),
    cell: (info) => info.getValue(),
    accessorFn: (row) => `${row.completion_tokens} + ${row.prompt_tokens}`,
  },
  columnHelper.accessor("input", {
    header: "Prompt",
    enableSorting: false,
    enableHiding: true,
    cell: (props) => (
      <ChatMessage inline={true} data={getLastMessage(props.getValue())} />
    ),
  }),
  columnHelper.accessor("output", {
    header: "Response",
    enableSorting: false,
    enableHiding: true,
    cell: (props) => (
      <ChatMessage inline={true} data={getLastMessage(props.getValue())} />
    ),
  }),
]

export default function Generations() {
  const { generations } = useGenerations()

  return (
    <Stack>
      <Title>Generations</Title>
      <DataTable columns={columns} data={generations} />
    </Stack>
  )
}
