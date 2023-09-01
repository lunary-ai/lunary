import Router from "next/router"

import { Group, Loader, Stack, Title } from "@mantine/core"

import DataTable from "@/components/Blocks/DataTable"

import {
  durationColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  timeColumn,
  userColumn,
} from "@/utils/datatable"
import { useRuns } from "@/utils/supabaseHooks"
import Empty from "@/components/Layout/Empty"
import { IconRobot } from "@tabler/icons-react"

const columns = [
  timeColumn("created_at", "Time"),
  nameColumn("Agent"),
  durationColumn(),
  userColumn(),
  inputColumn("Input"),
  outputColumn(),
]

export default function Agents() {
  const { runs, loading } = useRuns("agent", {}, true)

  if (!loading && runs?.length === 0) {
    return <Empty Icon={IconRobot} what="agents traces" />
  }

  return (
    <Stack>
      <Group>
        <Title>Agents Traces</Title>
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
