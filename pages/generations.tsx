import DataTable from "@/components/Blocks/DataTable"

import { useRuns } from "@/utils/supabaseHooks"
import {
  Button,
  Drawer,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core"

import SmartViewer from "@/components/Blocks/SmartViewer"
import {
  durationColumn,
  inputColumn,
  outputColumn,
  timeColumn,
  userColumn,
  nameColumn,
  costColumn,
  tagsColumn,
} from "@/utils/datatable"
import Empty from "@/components/Layout/Empty"
import { IconBrandOpenai } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useState } from "react"
import { useDisclosure } from "@mantine/hooks"
import { formatDateTime } from "@/utils/format"
import TokensBadge from "@/components/Blocks/TokensBadge"

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
  tagsColumn(),
  inputColumn("Prompt"),
  outputColumn("Result"),
]

export default function Generations() {
  const { runs, loading, validating, loadMore } = useRuns("llm")

  const [selected, setSelected] = useState(null)

  if (!loading && runs?.length === 0) {
    return <Empty Icon={IconBrandOpenai} what="requests" />
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-size))"}>
      <NextSeo title="Requests" />
      <Group>
        <Title>Generations</Title>
        {loading && <Loader />}
      </Group>

      <Drawer
        opened={!!selected}
        keepMounted
        position="right"
        title={selected ? formatDateTime(selected.created_at) : ""}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <Stack>
            <Text size="sm">Model: {selected.name}</Text>

            <Group position="apart">
              <Text weight="bold" size="sm">
                Input
              </Text>
              <TokensBadge tokens={selected.prompt_tokens} />
            </Group>
            <SmartViewer data={selected.input} />
            <Group position="apart">
              <Text weight="bold" size="sm">
                {selected.error ? "Error" : "Output"}
              </Text>
              <TokensBadge tokens={selected.completion_tokens} />
            </Group>
            <SmartViewer data={selected.output} error={selected.error} />
          </Stack>
        )}
      </Drawer>

      <DataTable
        onRowClicked={(row) => {
          setSelected(row)
          // setSelected(row.original)
        }}
        loading={loading || validating}
        loadMore={loadMore}
        columns={columns}
        data={runs}
      />
    </Stack>
  )
}
