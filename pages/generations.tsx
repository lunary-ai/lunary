import DataTable from "@/components/Blocks/DataTable"

import {
  useCurrentApp,
  useGenerations,
  useModelNames,
  useTags,
  useTeam,
} from "@/utils/dataHooks"
import {
  Button,
  Drawer,
  Group,
  Menu,
  MultiSelect,
  Stack,
  Text,
} from "@mantine/core"

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
import {
  IconArrowBarUp,
  IconBrandOpenai,
  IconFileExport,
  IconPlus,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useContext, useState } from "react"

import TokensBadge from "@/components/Blocks/TokensBadge"
import { formatDateTime } from "@/utils/format"
import { useDebouncedState } from "@mantine/hooks"
import Empty from "../components/Layout/Empty"
import { AppContext } from "../utils/context"
import { modals } from "@mantine/modals"
import SearchBar from "@/components/Blocks/SearchBar"

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
  tags: string[]
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
  const { app } = useCurrentApp()

  const { runs, loading, validating, loadMore } = useGenerations(
    query,
    selectedModels,
    selectedTags
  )
  const { tags } = useTags()
  const { team } = useTeam()

  const [selected, setSelected] = useState(null)

  const exportUrl = buildExportUrl(appId, query, selectedModels, selectedTags)

  if (!loading && !app?.activated) {
    return <Empty Icon={IconBrandOpenai} what="requests" />
  }

  function exportButton(url: string) {
    if (team.plan === "pro") {
      return {
        component: "a",
        href: url,
      }
    } else {
      return {
        onClick: () => {
          modals.openContextModal({
            modal: "upgrade",
            size: 800,
            innerProps: {},
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
        {selected && (
          <Stack>
            <Text size="sm">Model: {selected.name}</Text>
            {typeof selected.params?.temperature !== "undefined" && (
              <Text size="sm">Temperature: {selected.params?.temperature}</Text>
            )}

            {typeof selected.params?.max_tokens !== "undefined" && (
              <Text size="sm">Max tokens: {selected.params?.max_tokens}</Text>
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
