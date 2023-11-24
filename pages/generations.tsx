// import DataTable from "@/components/Blocks/DataTable.1"

import { Button, Group, Stack, Table } from "@mantine/core"
import FacetedFilter from "../components/Blocks/FacetedFilter"
import ExportButton from "../components/Blocks/ExportButton"
import { useGenerations, useModelNames } from "../utils/dataHooks"
import MultiSelectButton from "../components/Blocks/MultiSelectButton"
import { useEffect, useState } from "react"
import DataTable from "../components/Blocks/DataTable"
import {
  costColumn,
  durationColumn,
  feedbackColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  tagsColumn,
  timeColumn,
  userColumn,
} from "../utils/datatable"
import { useDebouncedState } from "@mantine/hooks"
import SearchBar from "../components/Blocks/SearchBar"
import { useSearchParams } from "next/navigation"

const columns = [
  timeColumn("created_at"),
  nameColumn("Model"),
  durationColumn(),
  userColumn(),
  {
    header: "Tokens",
    size: 25,
    id: "tokens",
    sortingFn: (a, b) =>
      a.original.completion_tokens +
      a.original.prompt_tokens -
      (b.original.completion_tokens + b.original.prompt_tokens),
    cell: (props) => props.getValue(),
    accessorFn: (row) => row.prompt_tokens + row.completion_tokens,
  },
  costColumn(),
  feedbackColumn(),
  tagsColumn(),
  inputColumn("Prompt"),
  outputColumn("Result"),
]

export default function Generations() {
  const { modelNames } = useModelNames()
  const [filters, setFilters] = useState(["Model", "Tags"])
  const [search, setSearch] = useDebouncedState<string>("", 500)
  const { runs, loading, validating, loadMore } = useGenerations(search)

  const searchParams = useSearchParams()
  // const models = searchParams.get("model")
  // console.log(models)

  // useEffect(() => {
  //   console.log(models)
  // }, [models])

  return (
    <Stack>
      <Group justify="space-between" wrap="nowrap" align="flex-end">
        <Group>
          <SearchBar />
          {filters.map((filter) => (
            <FacetedFilter key={filter} name={filter} items={modelNames} />
          ))}
          <MultiSelectButton
            label="Add filter"
            items={columns.map((c) => c.header)}
            selectedItems={filters}
            setSelectedItems={setFilters}
          />
        </Group>
        <ExportButton exportUrl="" />
      </Group>
      <DataTable
        // onRowClicked={(row) => {
        //   setSelected(row)
        // }}
        loading={loading || validating}
        // loadMore={loadMore}
        columns={columns}
        data={runs}
      />
    </Stack>
  )
}
