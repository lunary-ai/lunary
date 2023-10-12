import DataTable from "@/components/Blocks/DataTable"

import { useRuns, useTest2 } from "@/utils/supabaseHooks"
import { Drawer, Group, Input, Stack, Text, Title } from "@mantine/core"

import SmartViewer from "@/components/Blocks/SmartViewer"
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
} from "@/utils/datatable"
import { IconBrandOpenai, IconSearch } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useState } from "react"

import TokensBadge from "@/components/Blocks/TokensBadge"
import { formatDateTime } from "@/utils/format"
import useSWR from "swr"
import Empty from "../components/Layout/Empty"
import { useDebouncedState } from "@mantine/hooks"

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
  // const { runs, loading, validating, loadMore } = useRuns("llm")
  const [query, setQuery] = useDebouncedState(null, 1000)
  const { runs, loading, validating, loadMore } = useTest2(query)
  console.log(runs)

  const [selected, setSelected] = useState(null)

  if (!loading && runs?.length === 0 && query === null) {
    return <Empty Icon={IconBrandOpenai} what="requests" />
  }

  console.log(query)

  return (
    <Stack h={"calc(100vh - var(--navbar-size))"}>
      <NextSeo title="Requests" />
      <Group position="apart">
        <Title>Generations</Title>
        <Input
          icon={<IconSearch />}
          defaultValue={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </Group>

      <Drawer
        opened={!!selected}
        size="lg"
        keepMounted
        position="right"
        title={selected ? formatDateTime(selected.created_at) : ""}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <Stack>
            <Text size="sm">Model: {selected.name}</Text>
            {typeof selected.params?.temperature !== "undefined" && (
              <Text size="sm">Temperature: {selected.params?.temperature}</Text>
            )}

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
        }}
        loading={loading || validating}
        loadMore={loadMore}
        columns={columns}
        data={runs}
      />
    </Stack>
  )
}
