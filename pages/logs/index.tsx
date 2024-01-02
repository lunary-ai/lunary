import DataTable from "@/components/Blocks/DataTable"

import {
  useAllFeedbacks,
  useConvosByFeedback,
  useCurrentApp,
  useFilteredLLMCalls,
  useModelNames,
  useProfile,
  useRuns,
  useTags,
  useTraces,
  useUsers,
} from "@/utils/dataHooks"
import {
  ActionIcon,
  Button,
  Drawer,
  Flex,
  Group,
  Menu,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@mantine/core"

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
  IconBraces,
  IconBrandOpenai,
  IconDotsVertical,
  IconFileExport,
  IconFilter,
  IconListTree,
  IconMessages,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useContext, useEffect, useState } from "react"

import FiltersModal from "@/components/Blocks/FiltersModal"
import RunInputOutput from "@/components/Blocks/RunInputOutput"
import SearchBar from "@/components/Blocks/SearchBar"
import { openUpgrade } from "@/components/Layout/UpgradeModal"
import analytics from "@/utils/analytics"
import { formatDateTime } from "@/utils/format"
import { useDebouncedState, useLocalStorage, useSetState } from "@mantine/hooks"
import FacetedFilter from "../../components/Blocks/FacetedFilter"
import Empty from "../../components/Layout/Empty"
import { AppContext } from "../../utils/context"
import Router from "next/router"

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

const tracesColumns = [
  timeColumn("created_at", "Time"),
  nameColumn("Agent"),
  durationColumn(),
  userColumn(),
  feedbackColumn(true),
  tagsColumn(),
  inputColumn("Input"),
  outputColumn(),
]

const chatsColumns = [
  timeColumn("created_at", "Started at"),
  durationColumn("full"),
  userColumn(),
  inputColumn("Last Message"),
  tagsColumn(),
  feedbackColumn(true),
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
  const [selectedFilters, setSelectedFilters] = useSetState({})
  const [isModalOpened, setIsModalOpened] = useState(false)
  const [views, setViews] = useLocalStorage({
    key: "views",
    defaultValue: [],
  })
  const [currentView, setCurrentView] = useState()

  const [selectedTab, setSelectedTab] = useState("llm-call")

  useEffect(() => {
    if (currentView) {
      setSelectedFilters(currentView.filters)
    }
  }, [currentView, setSelectedFilters])

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

  const traces = useTraces(query)

  const { tags } = useTags()
  const { profile } = useProfile()

  const [selected, setSelected] = useState(null)

  const exportUrl = appId
    ? buildExportUrl(appId, query, selectedModels, selectedTags)
    : ""

  const { allFeedbacks } = useAllFeedbacks()

  const [selectedChatItems, setSelectedChatItems] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const { runIds } = useConvosByFeedback(selectedChatItems)
  let chats = useRuns(
    undefined,
    {
      filter: ["type", "in", '("convo","thread")'],
    },
    runIds,
  )

  useEffect(() => {}, [selectedTab])

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

  function apply(items) {
    setSelectedFilters(items)
    setIsModalOpened(false)
  }

  function createView() {
    const name = prompt("Name")

    if (name) {
      const newViews = [...views, { name, filters: selectedFilters }]

      setViews(newViews)
    }
  }

  return (
    <>
      <FiltersModal
        opened={isModalOpened}
        setOpened={setIsModalOpened}
        defaultSelected={selectedFilters}
        save={apply}
      />
      <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
        <NextSeo title="Requests" />

        <Stack>
          <Paper p={4} px="sm">
            <Flex justify="space-between">
              <SearchBar
                query={query}
                ml={-8}
                setQuery={setQuery}
                variant="unstyled"
                size="sm"
              />

              <Group>
                <Button
                  variant="subtle"
                  onClick={() => setIsModalOpened(true)}
                  leftSection={<IconFilter size={12} />}
                  size="xs"
                >
                  Add filters
                </Button>
                <SegmentedControl
                  value={selectedTab}
                  size="xs"
                  w="fit-content"
                  onChange={setSelectedTab}
                  data={[
                    {
                      label: (
                        <Group gap="xs" wrap="nowrap" mx="xs">
                          <IconBrandOpenai
                            size="16px"
                            color="var(--mantine-color-blue-5)"
                          />
                          <Text size="xs">LLM</Text>
                        </Group>
                      ),
                      value: "llm-call",
                    },

                    {
                      label: (
                        <Group gap="xs" wrap="nowrap" mx="xs">
                          <IconListTree
                            size="16px"
                            color="var(--mantine-color-blue-5)"
                          />
                          <Text size="xs">Traces</Text>
                        </Group>
                      ),
                      value: "trace",
                    },

                    {
                      label: (
                        <Group gap="xs" wrap="nowrap" mx="xs">
                          <IconMessages
                            size="16px"
                            color="var(--mantine-color-blue-5)"
                          />
                          <Text size="xs">Threads</Text>
                        </Group>
                      ),
                      value: "chat",
                    },
                  ]}
                />

                <Menu withArrow shadow="sm" position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="light">
                      <IconDotsVertical size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconFileExport size={16} />}
                      {...exportButton(exportUrl)}
                    >
                      Export to CSV
                    </Menu.Item>
                    <Menu.Item
                      color="dark"
                      disabled
                      leftSection={<IconBraces size={16} />}
                      // {...exportButton(exportUrl)}
                    >
                      Export to JSONL
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Flex>
          </Paper>
          {Object.entries(selectedFilters).length > 0 && (
            <Paper px="xs" p={4}>
              <Flex justify="space-between">
                <Group>
                  {Object.entries(selectedFilters).map(
                    ([filterName, selected]) =>
                      selected && (
                        <FacetedFilter
                          key={filterName}
                          name={
                            filterName.charAt(0).toUpperCase() +
                            filterName.slice(1)
                          }
                          items={modelNames}
                          selectedItems={selectedModels}
                          setSelectedItems={setSelectedModels}
                        />
                      ),
                  )}
                </Group>
                <Group>
                  <Select
                    placeholder="Load a view..."
                    size="xs"
                    w={100}
                    variant="unstyled"
                    value={currentView?.name}
                    onChange={(viewName) =>
                      setCurrentView(
                        views.find(({ name }) => name === viewName),
                      )
                    }
                    data={views.map((view) => view.name)}
                  />

                  {Object.values(selectedFilters).length > 0 && (
                    <Button onClick={createView} size="compact-xs">
                      Save View
                    </Button>
                  )}
                </Group>
              </Flex>
            </Paper>
          )}
        </Stack>

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

        {selectedTab === "llm-call" && (
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
        )}

        {selectedTab === "trace" && (
          <DataTable
            type="traces"
            columns={tracesColumns}
            data={traces.runs}
            loadMore={traces.loadMore}
            loading={traces.loading || traces.validating}
            onRowClicked={(row) => {
              analytics.track("OpenTrace")

              Router.push(`/traces/${row.id}`)
            }}
          />
        )}

        {selectedTab === "chat" && (
          <DataTable
            type="chats"
            onRowClicked={(row) => {
              analytics.trackOnce("OpenChat")
              Router.push(`/chats?chat=${row.id}`)
              setSelectedChat(row)
            }}
            loading={chats.loading || chats.validating}
            loadMore={chats.loadMore}
            columns={chatsColumns}
            data={chats.runs}
          />
        )}
      </Stack>
    </>
  )
}
