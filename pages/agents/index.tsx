import { useEffect } from "react"
import Router from "next/router"

import { Group, Loader, Select, Stack, Title } from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"

import DataTable from "@/components/Blocks/DataTable"

import {
  durationColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  timeColumn,
  userColumn,
} from "@/utils/datatable"
import { useRunsUsage, useRuns } from "@/utils/supabaseHooks"

const columns = [
  timeColumn("created_at", "Time"),
  nameColumn("Agent"),
  durationColumn(),
  userColumn(),
  inputColumn("Input"),
  outputColumn(),
]

export default function Agents() {
  // const { usage } = useRunsUsage(30)

  // const agents = usage?.filter((u) => u.type === "agent") || []

  // const [agentName, setAgentName] = useLocalStorage<string | null>({
  //   key: "agentName",
  //   defaultValue: null,
  // })

  const { runs, loading } = useRuns("agent")

  // useEffect(() => {
  //   if (!agentName && agents?.length > 0) {
  //     setAgentName(agents[0].name)
  //   }
  // }, [agents])

  return (
    <Stack>
      <Group>
        <Title>Agents</Title>
        {loading && <Loader />}
      </Group>

      {/* <Select
        w={200}
        data={(agents || []).map((a) => ({ value: a.name, label: a.name }))}
        value={agentName}
        onChange={setAgentName}
      /> */}

      <DataTable
        columns={columns}
        data={runs}
        onRowClicked={(row) => Router.push(`/agents/${row.id}`)}
      />
    </Stack>
  )
}
