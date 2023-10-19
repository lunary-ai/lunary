import Router from "next/router"

import { Group, Input, Stack, Title } from "@mantine/core"

import DataTable from "@/components/Blocks/DataTable"

import Empty from "@/components/Layout/Empty"
import {
  durationColumn,
  feedbackColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  tagsColumn,
  timeColumn,
  userColumn,
} from "@/utils/datatable"
import { useTraces } from "@/utils/supabaseHooks"
import { useDebouncedState } from "@mantine/hooks"
import { IconRobot, IconSearch } from "@tabler/icons-react"

const columns = [
  timeColumn("created_at", "Time"),
  nameColumn("Agent"),
  durationColumn(),
  userColumn(),
  feedbackColumn(true),
  tagsColumn(),
  inputColumn("Input"),
  outputColumn(),
]

export default function Traces() {
  const [query, setQuery] = useDebouncedState(null, 1000)
  const { runs, loading, validating, loadMore } = useTraces(query)

  if (!loading && runs?.length === 0 && query === null) {
    return <Empty Icon={IconRobot} what="agents traces" />
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-size))"}>
      <Group position="apart">
        <Title>Traces</Title>
        <Input
          icon={<IconSearch size={16} />}
          w={500}
          placeholder="Type to filter"
          defaultValue={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
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
