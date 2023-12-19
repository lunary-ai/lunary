import Router from "next/router"

import { Stack } from "@mantine/core"

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
import { useTraces } from "@/utils/dataHooks"
import { useDebouncedState } from "@mantine/hooks"
import { IconListTree } from "@tabler/icons-react"
import SearchBar from "@/components/Blocks/SearchBar"
import analytics from "@/utils/analytics"

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
    return <Empty Icon={IconListTree} what="traces" />
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
      <SearchBar query={query} setQuery={setQuery} />

      <DataTable
        type="traces"
        columns={columns}
        data={runs}
        loadMore={loadMore}
        loading={loading || validating}
        onRowClicked={(row) => {
          analytics.track("OpenTrace")

          Router.push(`/traces/${row.id}`)
        }}
      />
    </Stack>
  )
}
