import ChatMessage from "@/components/ChatMessage"
import DataTable from "@/components/DataTable"

import { useGenerations } from "@/utils/supabaseHooks"
import { Anchor, Badge, Box, Modal, Stack, Title } from "@mantine/core"

import { createColumnHelper } from "@tanstack/react-table"
import { useState } from "react"

const columnHelper = createColumnHelper<any>()

const getLastMessage = (messages) => {
  if (Array.isArray(messages)) {
    return messages[messages.length - 1]
  }

  return messages
}

const MessageViewer = ({ data }) => {
  const [expand, setExpand] = useState(false)

  if (!data) return null

  const obj = Array.isArray(data) ? data : [data]

  return (
    <>
      <Modal
        title="Chat History"
        size="lg"
        opened={expand}
        onClose={() => setExpand(false)}
      >
        <Stack>
          {obj.map((message) => (
            <ChatMessage key={message.id} data={message} />
          ))}
        </Stack>
      </Modal>

      <Box onClick={() => setExpand(true)} sx={{ cursor: "pointer" }}>
        <ChatMessage inline={true} data={getLastMessage(obj)} />
        {obj.length > 1 && (
          <Anchor onClick={() => setExpand(true)}>View all</Anchor>
        )}
      </Box>
      <style jsx>{`
        :global(.mantine-Modal-inner) {
          padding-left: 0; // weird centering bug
        }
      `}</style>
    </>
  )
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
    accessorFn: (row) => `${row.prompt_tokens} + ${row.completion_tokens}`,
  },
  columnHelper.accessor("input", {
    header: "Prompt",
    enableSorting: false,
    cell: (props) => <MessageViewer data={props.getValue()} />,
  }),
  columnHelper.accessor("output", {
    header: "Response",
    enableSorting: false,
    cell: (props) => <MessageViewer data={props.getValue()} />,
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
