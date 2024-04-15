import DataTable from "@/components/blocks/DataTable"

import {
  ActionIcon,
  Button,
  Card,
  Drawer,
  Flex,
  Group,
  Loader,
  Menu,
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
  IconListTree,
  IconMessages,
  IconFilter,
} from "@tabler/icons-react"

import { NextSeo } from "next-seo"
import { useContext, useEffect, useState } from "react"

import { ChatReplay } from "@/components/blocks/RunChat"
import RunInputOutput from "@/components/blocks/RunInputOutput"
import SearchBar from "@/components/blocks/SearchBar"
import { openUpgrade } from "@/components/layout/UpgradeModal"
import CheckPicker from "@/components/checks/Picker"
import Empty from "@/components/layout/Empty"

import analytics from "@/utils/analytics"
import { formatDateTime } from "@/utils/format"
import { fetcher } from "@/utils/fetcher"
import { useProject, useOrg, useProjectInfiniteSWR } from "@/utils/dataHooks"
import { useDebouncedState, useDidUpdate } from "@mantine/hooks"
import { ProjectContext } from "@/utils/context"
import { CheckLogic, deserializeLogic, serializeLogic } from "shared"
import { useRouter } from "next/router"

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

const CHECKS_BY_TYPE = {
  llm: [
    "models",
    "tags",
    "users",
    "status",
    "metadata",
    "feedback",
    "cost",
    "duration",
    "tokens",
    "radar",
  ],
  trace: [
    "tags",
    "users",
    "status",
    "feedback",
    "duration",
    "metadata",
    "radar",
  ],
  thread: ["tags", "users", "feedback", "metadata", "radar"],
}

const editCheck = (filters, id, params) => {
  if (!params) {
    // Remove filter
    return filters.filter((f) => f.id !== id)
  }

  const newChecks = [...filters]
  const index = newChecks.findIndex((f) => f.id === id)
  if (index === -1) {
    newChecks.push({ id, params })
  } else {
    newChecks[index] = { id, params }
  }
  return newChecks
}

export default function Logs() {
  const router = useRouter()
  const { projectId } = useContext(ProjectContext)
  const { project, isLoading: projectLoading } = useProject()
  const { org } = useOrg()

  const [filters, setChecks] = useState<CheckLogic>([
    "AND",
    { id: "type", params: { type: "llm" } },
  ])
  const [showCheckBar, setShowCheckBar] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [serializedChecks, setSerializedChecks] = useState<string>("")
  const [type, setType] = useState<"llm" | "trace" | "thread">("llm")

  const [query, setQuery] = useDebouncedState<string | null>(null, 300)

  const {
    data: logs,
    loading,
    validating,
    loadMore,
  } = useProjectInfiniteSWR(`/runs?${serializedChecks}`)

  const selectedLog = logs?.filter(({ id }) => id === selectedId)[0]

  useDidUpdate(() => {
    let serialized = serializeLogic(filters)

    if (typeof serialized === "string") {
      setSerializedChecks(serialized)
      if (selectedId) {
        serialized += `&selected=${selectedId}`
      }
      router.replace(`/logs?${serialized}`)
    }
  }, [filters])

  useEffect(() => {
    // restore filters and selected log from query params
    try {
      const urlParams = new URLSearchParams(window.location.search)

      const selectedId = urlParams.get("selected")
      setSelectedId(selectedId)

      const type = urlParams.get("type")
      if (type === "llm" || type === "trace" || type === "thread") {
        setType(type)
      }

      const search = urlParams.get("search")
      setQuery(search)

      const paramString = urlParams.toString()
      if (paramString) {
        const filtersData = deserializeLogic(paramString)
        if (filtersData) {
          setChecks(filtersData)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    if (selectedId) {
      router.push({
        pathname: router.pathname,
        query: { ...router.query, selected: selectedId },
      })
    } else {
      const { selected, ...query } = router.query

      router.push({
        pathname: router.pathname,
        query,
      })
    }
  }, [selectedId])

  useDidUpdate(() => {
    // Change type filter and remove filters imcompatible with type
    const newChecks = editCheck(filters, "type", { type }).filter(
      (f) =>
        f === "AND" ||
        CHECKS_BY_TYPE[type].includes(f.id) ||
        ["type", "search"].includes(f.id),
    )
    setChecks(newChecks)
  }, [type])

  // Convert search query to filter
  useDidUpdate(() => {
    const newChecks = editCheck(
      filters,
      "search",
      query?.length ? { query } : null,
    )
    setChecks(newChecks)
  }, [query])

  const exportUrl = `/runs?${serializedChecks}&projectId=${projectId}`

  const showBar =
    showCheckBar ||
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
                    onClick={() => setShowCheckBar(true)}
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
            <CheckPicker
              minimal
              defaultOpened={showCheckBar}
              value={filters}
              onChange={setChecks}
              restrictTo={(f) => CHECKS_BY_TYPE[type].includes(f.id)}
            />
          )}
        </Stack>

        <Drawer
          opened={!!selectedId}
          size="xl"
          keepMounted
          position="right"
          title={selectedLog ? formatDateTime(selectedLog.createdAt) : ""}
          onClose={() => setSelectedId(null)}
        >
          {loading ? (
            <Loader />
          ) : (
            <>
              {selectedLog?.type === "llm" && (
                <RunInputOutput
                  initialRun={selectedLog}
                  withPlayground={true}
                  withShare={true}
                />
              )}
              {selectedLog?.type === "thread" && (
                <ChatReplay run={selectedLog} />
              )}
            </>
          )}
        </Drawer>

        <DataTable
          type={type}
          onRowClicked={(row) => {
            if (["agent", "chain"].includes(row.type)) {
              analytics.trackOnce("OpenTrace")
              router.push(`/traces/${row.id}`)
            } else {
              analytics.trackOnce("OpenRun")
              setSelectedId(row.id)
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
