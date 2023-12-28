import DataTable from "@/components/Blocks/DataTable"

import {
  useAllFeedbacks,
  useCurrentApp,
  useFilteredLLMCalls,
  useModelNames,
  useProfile,
  useTags,
  useUsers,
} from "@/utils/dataHooks"
import { Box, Button, Drawer, Flex, Group, Menu, Stack } from "@mantine/core"

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

import RunInputOutput from "@/components/Blocks/RunInputOutput"
import SearchBar from "@/components/Blocks/SearchBar"
import { openUpgrade } from "@/components/Layout/UpgradeModal"
import analytics from "@/utils/analytics"
import { formatAppUser, formatDateTime } from "@/utils/format"
import { useDebouncedState } from "@mantine/hooks"
import FacetedFilter from "../../components/Blocks/FacetedFilter"
import Feedback from "../../components/Blocks/Feedback"
import Empty from "../../components/Layout/Empty"
import { AppContext } from "../../utils/context"

const columns = [
  timeColumn("created_at"),
  nameColumn("Model"),
  durationColumn(),
  userColumn(),
  {
    header: "Tokens",
    size: 40,
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

export default function LLMCalls() {
  let { modelNames } = useModelNames()
  const [query, setQuery] = useDebouncedState(null, 500)

  const [selectedModels, setSelectedModels] = useState([])
  const [selectedTags, setSelectedTags] = useState([])

  const { appId } = useContext(AppContext)
  const { app, loading: appLoading } = useCurrentApp()

  const [selectedFeedbacks, setSelectedFeedbacks] = useState([])

  const { users } = useUsers()
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])

  const { runs, loading, validating, loadMore } = useFilteredLLMCalls(
    query,
    selectedModels,
    selectedTags,
    selectedFeedbacks,
    selectedUsers.map((u) => u.external_id),
  )
  const { tags } = useTags()
  const { profile } = useProfile()

  const [selected, setSelected] = useState(null)

  const exportUrl = appId
    ? buildExportUrl(appId, query, selectedModels, selectedTags)
    : ""

  const { allFeedbacks } = useAllFeedbacks()

  if (!loading && !appLoading && !app?.activated) {
    return <Empty Icon={IconBrandOpenai} what="requests" />
  }

  function exportButton(url: string) {
    if (profile?.org.plan !== "free") {
      return {
        href: url,
        component: "a",
        onClick: () => {
          analytics.trackOnce("ClickExport")
        },
      }
    } else {
      return {
        onClick: () => {
          analytics.trackOnce("ClickExport")
          openUpgrade("export")
        },
      }
    }
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
      <NextSeo title="Requests" />
      <Flex justify="space-between">
        <Group>
          <SearchBar query={query} setQuery={setQuery} />

          {modelNames?.length && (
            <FacetedFilter
              name="Models"
              items={modelNames}
              selectedItems={selectedModels}
              setSelectedItems={setSelectedModels}
            />
          )}
          {tags?.length && (
            <FacetedFilter
              name="Tags"
              items={tags}
              selectedItems={selectedTags}
              setSelectedItems={setSelectedTags}
            />
          )}
          {users?.length && (
            <FacetedFilter
              name="Users"
              items={users}
              render={formatAppUser}
              selectedItems={selectedUsers}
              setSelectedItems={setSelectedUsers}
              withUserSearch={true}
            />
          )}
          {allFeedbacks?.length && (
            <FacetedFilter
              name="Feedbacks"
              items={allFeedbacks}
              render={(item) => <Feedback data={item} />}
              selectedItems={selectedFeedbacks}
              setSelectedItems={setSelectedFeedbacks}
              withSearch={false}
            />
          )}
        </Group>
        <Box>
          <Menu withArrow shadow="sm" position="bottom-end">
            <Menu.Target>
              <Button
                variant="outline"
                size="xs"
                leftSection={<IconArrowBarUp size={16} />}
              >
                Export
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                // color="dark"
                leftSection={<IconFileExport size={16} />}
                {...exportButton(exportUrl)}
              >
                Export to CSV
              </Menu.Item>
              <Menu.Item
                disabled
                leftSection={<IconBraces size={16} />}
                // {...exportButton(exportUrl)}
              >
                Export to JSONL
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
      </Flex>

      <Drawer
        opened={!!selected}
        size="xl"
        keepMounted
        position="right"
        title={selected ? formatDateTime(selected.created_at) : ""}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <RunInputOutput
            initialRun={selected}
            withPlayground={true}
            withShare={true}
          />
        )}
      </Drawer>

      <DataTable
        type="llm"
        onRowClicked={(row) => {
          analytics.trackOnce("OpenRun")

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
