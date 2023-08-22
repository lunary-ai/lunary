import DataTable from "@/components/Blocks/DataTable"

import { useRuns } from "@/utils/supabaseHooks"
import { Badge, Group, Loader, Stack, Title } from "@mantine/core"

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
  costColumn,
} from "@/utils/datatable"
import Empty from "@/components/Layout/Empty"
import { IconBrandOpenai } from "@tabler/icons-react"

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
  inputColumn("Prompt"),
  outputColumn("Result"),
]

export default function Generations() {
  const { runs, loading } = useRuns("llm")

  if (!loading && runs.length === 0) {
    return <Empty Icon={IconBrandOpenai} what="requests" />
  }

  return (
    <Stack>
      <Group>
        <Title>Generations</Title>
        {loading && <Loader />}
      </Group>

      <DataTable columns={columns} data={runs} />
    </Stack>
  )
}
