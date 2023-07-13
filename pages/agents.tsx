import ChatMessage from "@/components/ChatMessage"
import DataTable from "@/components/DataTable"
import JsonViewer from "@/components/JSONViewer"
import ObjectViewer from "@/components/ObjectViewer"

import { useAgentRuns, useAgents, useGenerations } from "@/utils/supabaseHooks"
import {
  Anchor,
  Badge,
  Box,
  Modal,
  SegmentedControl,
  Select,
  Spoiler,
  Stack,
  Title,
} from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"

import { createColumnHelper } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"

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
  columnHelper.accessor("name", {
    header: "Agent",
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
  columnHelper.accessor("input", {
    header: "Input",
    enableSorting: false,
    cell: (props) => <ObjectViewer data={props.getValue()} />,
  }),
  columnHelper.accessor("output", {
    header: "Response",
    enableSorting: false,
    cell: (props) => (
      <Spoiler maxHeight={50} showLabel="..." hideLabel="↑">
        <JsonViewer data={props.getValue()} />
      </Spoiler>
    ),
  }),
]

export default function Generations() {
  const { agents, loading } = useAgents()
  const [agentName, setAgentName] = useLocalStorage<string | null>({
    key: "agentName",
    defaultValue: null,
  })

  const { agentRuns } = useAgentRuns(agentName)

  useEffect(() => {
    if (!agentName && agents?.length > 0) {
      setAgentName(agents[0].name)
    }
  }, [agents])

  return (
    <Stack>
      <Title>Agents</Title>

      <Select
        w={200}
        data={(agents || []).map((a) => ({ value: a.name, label: a.name }))}
        value={agentName}
        onChange={setAgentName}
      />

      <DataTable columns={columns} data={agentRuns} />
    </Stack>
  )
}
