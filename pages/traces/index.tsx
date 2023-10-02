import Router from "next/router"

import { Group, Loader, Stack, Title } from "@mantine/core"

import DataTable from "@/components/Blocks/DataTable"

import {
  durationColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  tagsColumn,
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
  tagsColumn(),
  inputColumn("Input"),
  outputColumn(),
]

export default function Agents() {
  const { runs, loading, validating, loadMore } = useRuns("agent", {
    filter: ["parent_run", "is", null],
  })

  if (!loading && runs?.length === 0) {
    return <Empty Icon={IconRobot} what="agents traces" />
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-size))"}>
      <Group>
        <Title>Traces</Title>
        {loading && <Loader />}
      </Group>

      <DataTable
        columns={columns}
        data={runs}
        loadMore={loadMore}
        loading={loading || validating}
        onRowClicked={(row) => Router.push(`/traces/${row.id}`)}
      />
    </Stack>
  )
}
