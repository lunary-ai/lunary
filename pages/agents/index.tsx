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
  const { runs, loading, validating, loadMore } = useRuns("agent", {}, true)

  if (!loading && runs?.length === 0) {
    return <Empty Icon={IconRobot} what="agents traces" />
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-size))"}>
      <Group>
        <Title>Agents Traces</Title>
        {loading && <Loader />}
      </Group>

      <DataTable
        columns={columns}
        data={runs}
        loadMore={loadMore}
        loading={loading || validating}
        onRowClicked={(row) => Router.push(`/agents/${row.id}`)}
      />
    </Stack>
  )
}
