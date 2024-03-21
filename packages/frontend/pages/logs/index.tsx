import DataTable from "@/components/blocks/DataTable"

import {
  ActionIcon,
  Button,
  Card,
  Drawer,
  Flex,
  Group,
  Menu,
  Paper,
  SegmentedControl,
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

import { ChatReplay } from "@/components/blocks/RunChat"
import RunInputOutput from "@/components/blocks/RunInputOutput"
import SearchBar from "@/components/blocks/SearchBar"
import { openUpgrade } from "@/components/layout/UpgradeModal"
import analytics from "@/utils/analytics"
import { formatDateTime } from "@/utils/format"
import {
  useProject,
  useLogs,
  useOrg,
  useProjectInfiniteSWR,
} from "@/utils/dataHooks"
import { useDebouncedState, useDidUpdate } from "@mantine/hooks"
import Router from "next/router"
import Empty from "../../components/layout/Empty"
import { ProjectContext } from "../../utils/context"
import FilterPicker from "@/components/filters/Picker"
import { FilterLogic, deserializeLogic, serializeLogic } from "shared"
import { fetcher } from "@/utils/fetcher"

const columns = {
  llm: [
    timeColumn("createdAt"),
    nameColumn("Model"),
    durationColumn(),
    userColumn(),
    {
      header: "Tokens",
      size: 40,
      id: "tokens",
      sortingFn: (a, b) => a.tokens.total - b.tokens.total,
      cell: (props) => props.getValue(),
      accessorFn: (row) => row.tokens.total,
    },
    costColumn(),
    feedbackColumn(),
    tagsColumn(),
    inputColumn("Prompt"),
    outputColumn("Result"),
  ],
  trace: [
    timeColumn("createdAt", "Time"),
    nameColumn("Agent"),
    durationColumn(),
    userColumn(),
    feedbackColumn(true),
    tagsColumn(),
    inputColumn("Input"),
    outputColumn(),
  ],
  thread: [
    timeColumn("createdAt", "Started at"),
    userColumn(),
    inputColumn("Last Message"),
    tagsColumn(),
    feedbackColumn(true),
  ],
}

const FILTERS_BY_TYPE = {
  llm: [
    "models",
    "tags",
    "users",
    "status",
    "feedback",
    "cost",
    "duration",
    "tokens",
    "radar",
  ],
  trace: ["tags", "users", "status", "duration", "radar"],
  thread: ["tags", "users", "status", "radar"],
}

const editFilter = (filters, id, params) => {
  if (!params) {
    // Remove filter
    return filters.filter((f) => f.id !== id)
  }

  const newFilters = [...filters]
  const index = newFilters.findIndex((f) => f.id === id)
  if (index === -1) {
    newFilters.push({ id, params })
  } else {
    newFilters[index] = { id, params }
  }
  return newFilters
}

export default function Logs() {
  const { projectId } = useContext(ProjectContext)
  const { project, isLoading: projectLoading } = useProject()
  const { org } = useOrg()

  const [filters, setFilters] = useState<FilterLogic>([
    "AND",
    { id: "type", params: { type: "llm" } },
  ])
  const [showFilterBar, setShowFilterBar] = useState(false)
  const [selected, setSelected] = useState(null)
  const [serializedFilters, setSerializedFilters] = useState<string>("")
  const [type, setType] = useState<"llm" | "trace" | "thread">("llm")

  const [query, setQuery] = useDebouncedState("", 300)

  const {
    data: logs,
    loading,
    validating,
    loadMore,
  } = useProjectInfiniteSWR(`/runs?${serializedFilters}`)

  useDidUpdate(() => {
    const serialized = serializeLogic(filters)

    if (typeof serialized === "string") {
      setSerializedFilters(serialized)
      Router.replace(`/logs?${serialized}`)
    }
  }, [filters])

  useEffect(() => {
    // restore filters from query params
    try {
      const params = window.location.search.replace("?", "")
      if (params) {
        const type = new URLSearchParams(params).get("type") || "llm"
        if (type) setType(type as any)

        const search = new URLSearchParams(params).get("search")
        if (search) setQuery(search as any)

        const filtersData = deserializeLogic(params)
        if (filtersData) setFilters(filtersData)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  useDidUpdate(() => {
    // Change type filter and remove filters imcompatible with type
    const newFilters = editFilter(filters, "type", { type }).filter(
      (f) =>
        f === "AND" ||
        FILTERS_BY_TYPE[type].includes(f.id) ||
        ["type", "search"].includes(f.id),
    )
    setFilters(newFilters)
  }, [type])

  // Convert search query to filter
  useDidUpdate(() => {
    const newFilters = editFilter(
      filters,
      "search",
      query?.length ? { query } : null,
    )
    setFilters(newFilters)
  }, [query])

  const exportUrl = `/runs?${serializedFilters}&projectId=${projectId}`

  const showBar =
    showFilterBar ||
    filters.filter((f) => f !== "AND" && !["search", "type"].includes(f.id))
      .length > 0

  function exportButton(url: string) {
    return {
      component: "a",
      onClick: () => {
        analytics.trackOnce("ClickExport")

        if (org?.plan === "free") {
          openUpgrade("export")
          return
        }

        fetcher.getFile(url)
      },
    }
  }

  return (
    <Empty
      enable={!loading && !projectLoading && project && !project.activated}
      Icon={IconBrandOpenai}
      title="Waiting for recordings..."
      showProjectId
      description="Once you've setup the SDK, your LLM calls and traces will appear here."
    >
      <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
        <NextSeo title="Requests" />

        <Stack>
          <Card withBorder p={4} px="sm">
            <Flex justify="space-between">
              <SearchBar
                query={query}
                ml={-8}
                setQuery={setQuery}
                variant="unstyled"
                size="sm"
              />

              <Group gap="xs">
                {!showBar && (
                  <Button
                    variant="subtle"
                    onClick={() => setShowFilterBar(true)}
                    leftSection={<IconFilter size={12} />}
                    size="xs"
                  >
                    Add filters
                  </Button>
                )}
                <SegmentedControl
                  value={type}
                  size="xs"
                  w="fit-content"
                  onChange={setType}
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
                      value: "llm",
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
                      value: "thread",
                    },
                  ]}
                />

                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="light">
                      <IconDotsVertical size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      disabled={type === "thread"}
                      leftSection={<IconFileExport size={16} />}
                      {...exportButton(exportUrl + "&exportType=csv")}
                    >
                      Export to CSV
                    </Menu.Item>
                    <Menu.Item
                      color="dimmed"
                      disabled={type === "thread"}
                      leftSection={<IconBraces size={16} />}
                      {...exportButton(exportUrl + "&exportType=jsonl")}
                    >
                      Export to JSONL
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Flex>
          </Card>
          {showBar && (
            <FilterPicker
              minimal
              defaultOpened={showFilterBar}
              value={filters}
              onChange={setFilters}
              restrictTo={(f) => FILTERS_BY_TYPE[type].includes(f.id)}
            />
          )}
        </Stack>

        <Drawer
          opened={!!selected}
          size="xl"
          keepMounted
          position="right"
          title={selected ? formatDateTime(selected.createdAt) : ""}
          onClose={() => setSelected(null)}
        >
          {selected?.type === "llm" && (
            <RunInputOutput
              initialRun={selected}
              withPlayground={true}
              withShare={true}
            />
          )}

          {selected?.type === "thread" && <ChatReplay run={selected} />}
        </Drawer>

        <DataTable
          type={type}
          onRowClicked={(row) => {
            if (["agent", "chain"].includes(row.type)) {
              analytics.trackOnce("OpenTrace")
              Router.push(`/traces/${row.id}`)
            } else {
              analytics.trackOnce("OpenRun")
              setSelected(row)
            }
          }}
          loading={loading || validating}
          loadMore={loadMore}
          columns={columns[type]}
          data={logs}
        />
      </Stack>
    </Empty>
  )
}
