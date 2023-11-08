import DataTable from "@/components/Blocks/DataTable"

import {
  useCurrentApp,
  useGenerations,
  useModelNames,
  useProfile,
  useTags,
} from "@/utils/dataHooks"
import { Button, Drawer, Group, Menu, MultiSelect, Stack } from "@mantine/core"

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
import {
  IconArrowBarUp,
  IconBraces,
  IconBrandOpenai,
  IconFileExport,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useContext, useState } from "react"

import RunInputOutput from "@/components/Blocks/RunIO"
import SearchBar from "@/components/Blocks/SearchBar"
import { formatDateTime } from "@/utils/format"
import { useDebouncedState } from "@mantine/hooks"
import { modals } from "@mantine/modals"
import Empty from "../components/Layout/Empty"
import { AppContext } from "../utils/context"

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

function buildExportUrl(
  appId: string,
  query: string | null,
  models: string[],
  tags: string[],
) {
  const url = new URL("/api/generation/export", window.location.origin)

  url.searchParams.append("appId", appId)

  if (query) {
    url.searchParams.append("search", query)
  }

  if (models.length > 0) {
    url.searchParams.append("models", models.join(","))
  }

  if (tags.length > 0) {
    url.searchParams.append("tags", tags.join(","))
  }

  return url.toString()
}

export default function Generations() {
  let { modelNames } = useModelNames()
  const [query, setQuery] = useDebouncedState(null, 500)

  const [filters, setFilters] = useState([])
  const [selectedModels, setSelectedModels] = useState([])
  const [selectedTags, setSelectedTags] = useState([])

  const { appId } = useContext(AppContext)
  const { app, loading: appLoading } = useCurrentApp()

  const { runs, loading, validating, loadMore } = useGenerations(
    query,
    selectedModels,
    selectedTags,
  )
  const { tags } = useTags()
  const { profile } = useProfile()

  const [selected, setSelected] = useState(null)

  const exportUrl = buildExportUrl(appId, query, selectedModels, selectedTags)

  if (!loading && !appLoading && !app?.activated) {
    return <Empty Icon={IconBrandOpenai} what="requests" />
  }

  function exportButton(url: string) {
    if (profile?.org.plan === "pro") {
      return {
        component: "a",
        href: url,
      }
    } else {
      return {
        onClick: () => {
          modals.openContextModal({
            modal: "upgrade",
            size: 900,
            innerProps: {
              highlight: "export",
            },
          })
        },
      }
    }
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-size))"}>
      <NextSeo title="Requests" />
      <Group position="apart">
        <Group>
          <SearchBar query={query} setQuery={setQuery} />

          {modelNames?.length && (
            <MultiSelect
              placeholder="Model"
              size="xs"
              miw={80}
              w="fit-content"
              data={modelNames}
              clearable
              onChange={setSelectedModels}
            />
          )}
          {tags?.length && (
            <MultiSelect
              placeholder="Tags"
              size="xs"
              miw={100}
              w="fit-content"
              data={tags}
              clearable
              onChange={setSelectedTags}
            />
          )}
        </Group>
        <Menu withArrow shadow="sm" position="bottom-end">
          <Menu.Target>
            <Button
              variant="outline"
              size="xs"
              leftIcon={<IconArrowBarUp size={16} />}
            >
              Actions
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              color="dark"
              icon={<IconFileExport size={16} />}
              {...exportButton(exportUrl)}
            >
              Export to CSV
            </Menu.Item>
            <Menu.Item
              color="dark"
              disabled
              icon={<IconBraces size={16} />}
              // {...exportButton(exportUrl)}
            >
              Export to JSONL
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Drawer
        opened={!!selected}
        size="lg"
        keepMounted
        position="right"
        title={selected ? formatDateTime(selected.created_at) : ""}
        onClose={() => setSelected(null)}
      >
        {selected && <RunInputOutput run={selected} />}
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
