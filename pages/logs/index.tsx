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
import {
  Box,
  Button,
  Center,
  Drawer,
  Flex,
  Group,
  Menu,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Title,
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
  IconArrowBarUp,
  IconBraces,
  IconBrandOpenai,
  IconEye,
  IconFileExport,
  IconFilter,
  IconListTree,
  IconMessages,
} from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useContext, useEffect, useState } from "react"

import RunInputOutput from "@/components/Blocks/RunInputOutput"
import SearchBar from "@/components/Blocks/SearchBar"
import { openUpgrade } from "@/components/Layout/UpgradeModal"
import analytics from "@/utils/analytics"
import { formatAppUser, formatDateTime } from "@/utils/format"
import { useDebouncedState, useLocalStorage, useSetState } from "@mantine/hooks"
import FacetedFilter from "../../components/Blocks/FacetedFilter"
import Feedback from "../../components/Blocks/Feedback"
import Empty from "../../components/Layout/Empty"
import { AppContext } from "../../utils/context"
import FiltersModal from "@/components/Blocks/FiltersModal"

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
  const [selectedFilters, setSelectedFilters] = useSetState({})
  const [isModalOpened, setIsModalOpened] = useState(false)
  const [views, setViews] = useLocalStorage({
    key: "views",
    defaultValue: [],
  })
  const [currentView, setCurrentView] = useState()

  const [selectedTab, setSelectedTab] = useState("llm-call")

  useEffect(() => {
    console.log(currentView)
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
          <Group justify="space-between">
            <Title>Logs</Title>
            <Group gap="sm">
              <Select
                placeholder="Load a view..."
                value={currentView?.name}
                onChange={(viewName) =>
                  setCurrentView(views.find(({ name }) => name === viewName))
                }
                data={views.map((view) => view.name)}
              />

              {Object.values(selectedFilters).length > 0 && (
                <Button onClick={createView} size="xs">
                  Save View
                </Button>
              )}

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
                    color="dark"
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
          </Group>
          <Box w="800px" mt="lg">
            <SegmentedControl
              value={selectedTab}
              onChange={setSelectedTab}
              data={[
                {
                  label: (
                    <Center style={{ gap: 10 }} mx="md">
                      <IconBrandOpenai size="16px" />
                      <span>LLM Calls</span>
                    </Center>
                  ),
                  value: "llm-call",
                },

                {
                  label: (
                    <Center style={{ gap: 10 }} mx="md">
                      <IconListTree size="16px" />
                      <span>Traces</span>
                    </Center>
                  ),
                  value: "trace",
                },

                {
                  label: (
                    <Center style={{ gap: 10 }} mx="md">
                      <IconMessages size="16px" />
                      <span>Chats</span>
                    </Center>
                  ),
                  value: "chat",
                },
              ]}
            />
          </Box>
          <Flex justify="space-between">
            <Group>
              <SearchBar query={query} setQuery={setQuery} />

              <Button
                variant="outline"
                onClick={() => setIsModalOpened(true)}
                leftSection={<IconFilter size="18" />}
                size="xs"
              >
                Add filters
              </Button>

              {Object.entries(selectedFilters).map(
                ([filterName, selected]) =>
                  selected && (
                    <FacetedFilter
                      key={filterName}
                      name={
                        filterName.charAt(0).toUpperCase() + filterName.slice(1)
                      }
                      items={modelNames}
                      selectedItems={selectedModels}
                      setSelectedItems={setSelectedModels}
                    />
                  ),
              )}
            </Group>
          </Flex>
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
    </>
  )
}
