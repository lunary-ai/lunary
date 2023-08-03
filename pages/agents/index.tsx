import DataTable from "@/components/Blocks/DataTable"
import SmartViewer from "@/components/Blocks/SmartViewer"

import { useGroupedRunsWithUsage, useRuns } from "@/utils/supabaseHooks"
import { Badge, Select, Stack, Title } from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"

import { createColumnHelper } from "@tanstack/react-table"
import Router from "next/router"
import { useEffect } from "react"

const columnHelper = createColumnHelper<any>()

const columns = [
  columnHelper.accessor("created_at", {
    header: "Time",
    size: 40,
    enableResizing: false,
    sortingFn: (a, b) =>
      new Date(a.getValue("created_at")).getTime() -
      new Date(b.getValue("created_at")).getTime(),
    cell: (info) => new Date(info.getValue()).toLocaleTimeString(),
  }),
  columnHelper.accessor("name", {
    header: "Agent",
    size: 60,
    cell: (props) => <Badge color="blue">{props.getValue()}</Badge>,
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    size: 40,
    cell: (props) => (
      <Badge color={props.getValue() === "success" ? "green" : "red"}>
        {props.getValue()}
      </Badge>
    ),
  }),
  {
    id: "duration",
    header: "Duration",
    size: 25,
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
    cell: (props) => <SmartViewer data={props.getValue()} compact />,
  }),
  columnHelper.accessor("output", {
    header: "Response",
    enableSorting: false,
    cell: (props) => (
      <SmartViewer
        data={props.getValue()}
        error={props.row.original.error}
        compact
      />
    ),
  }),
]

export default function Generations() {
  const { usage } = useGroupedRunsWithUsage(30)

  const agents = usage?.filter((u) => u.type === "agent") || []

  const [agentName, setAgentName] = useLocalStorage<string | null>({
    key: "agentName",
    defaultValue: null,
  })

  const { runs } = useRuns("agent", agentName)

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

      <DataTable
        columns={columns}
        data={runs}
        onRowClicked={(row) => Router.push(`/agents/${row.id}`)}
      />
    </Stack>
  )
}
