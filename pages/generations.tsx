import DataTable from "@/components/Blocks/DataTable"

import { useRuns } from "@/utils/supabaseHooks"
import { Badge, Stack, Title } from "@mantine/core"

import { createColumnHelper } from "@tanstack/react-table"
import SmartViewer from "@/components/Blocks/SmartViewer"
import {
  durationColumn,
  inputColumn,
  outputColumn,
  statusColumn,
  timeColumn,
  userColumn,
  nameColumn,
} from "@/utils/datatable"

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
  inputColumn("Prompt"),
  outputColumn("Result"),
]

export default function Generations() {
  const { runs } = useRuns("llm")

  return (
    <Stack>
      <Title>Generations</Title>
      <DataTable columns={columns} data={runs} />
    </Stack>
  )
}
