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
  templateColumn,
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
  IconSquaresDiagonal,
  IconLayersIntersect,
  IconTrash,
  IconCopy,
} from "@tabler/icons-react"

import { NextSeo } from "next-seo"
import { use, useContext, useEffect, useState } from "react"

import { ChatReplay } from "@/components/blocks/RunChat"
import RunInputOutput from "@/components/blocks/RunInputOutput"
import SearchBar from "@/components/blocks/SearchBar"
import { openUpgrade } from "@/components/layout/UpgradeModal"
import CheckPicker from "@/components/checks/Picker"
import Empty from "@/components/layout/Empty"

import analytics from "@/utils/analytics"
import { formatDateTime } from "@/utils/format"
import { fetcher } from "@/utils/fetcher"
import {
  useProject,
  useOrg,
  useProjectInfiniteSWR,
  useRun,
} from "@/utils/dataHooks"

import { useDebouncedState, useDidUpdate } from "@mantine/hooks"
import { ProjectContext } from "@/utils/context"
import { CheckLogic, deserializeLogic, serializeLogic } from "shared"
import { useRouter } from "next/router"
import { modals } from "@mantine/modals"
import { useView, useViews } from "@/utils/dataHooks/views"
import RenamableField from "@/components/blocks/RenamableField"
import { VisibilityState } from "@tanstack/react-table"
import { notifications } from "@mantine/notifications"

const columns = {
  llm: [
    timeColumn("createdAt"),
    nameColumn("Model"),
    durationColumn(),
    // enrichmentColumn("topics"),
    // enrichmentColumn("sentiment"),
    // enrichmentColumn("pii"),

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
    templateColumn(),
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
    "type",
    "models",

    // "enrichment",
    "tags",
    "users",
    "templates",
    "status",
    "metadata",
    "feedback",
    "cost",
    "duration",
    "tokens",
    "radar",
  ],
  trace: [
    "type",
    "tags",
    "users",
    "status",
    // "feedback",
    "duration",
    "metadata",
    "radar",
  ],
  thread: [
    "type",
    "tags",
    "users",
    // "feedback",
    "metadata",
    "radar",
  ],
}

function editCheck(filters, id, params) {
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
  const { project, isLoading: projectLoading, setProjectId } = useProject()
  const { org } = useOrg()

  const [filters, setChecks] = useState<CheckLogic>([
    "AND",
    { id: "type", params: { type: "llm" } },
  ])

  const { insert: insertView, isInserting: isInsertingView } = useViews()

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [serializedChecks, setSerializedChecks] = useState<string>("")

  const [visibleColumns, setVisibleColumns] = useState<VisibilityState>()
  const [columnsTouched, setColumnsTouched] = useState(false)

  const [viewId, setViewId] = useState<string | undefined>()
  const { view, update: updateView, remove: removeView } = useView(viewId)

  const [type, setType] = useState<"llm" | "trace" | "thread">("llm")

  const [query, setQuery] = useDebouncedState<string | null>(null, 300)

  const {
    data: logs,
    loading,
    validating,
    loadMore,
    mutate,
  } = useProjectInfiniteSWR(`/runs?${serializedChecks}`)

  const { run: selectedRun, loading: runLoading } = useRun(selectedRunId)

  // useEffect(() => {
  //   const newColumns = { ...defaultColumns }
  //   if (type === "llm" && Array.isArray(evaluators)) {
  //     for (const evaluator of evaluators) {
  //       if (
  //         newColumns.llm
  //           .map(({ accessorKey }) => accessorKey)
  //           .includes("enrichment-" + evaluator.slug)
  //       ) {
  //         continue
  //       }

  //       newColumns.llm.splice(
  //         3,
  //         0,
  //         enrichmentColumn(evaluator.name, evaluator.slug, evaluator.type),
  //       )
  //     }
  //     setColumns(newColumns)
  //   }
  // }, [type, evaluators])

  useEffect(() => {
    if (selectedRun && selectedRun.projectId !== projectId) {
      setProjectId(selectedRun.projectId)
    }
  }, [selectedRun?.projectId])

  useDidUpdate(() => {
    let serialized = serializeLogic(filters)

    if (typeof serialized === "string") {
      setSerializedChecks(serialized)

      if (viewId) {
        serialized += `&view=${viewId}`
      }

      if (selectedRunId) {
        serialized += `&selected=${selectedRunId}`
      }

      router.replace(`/logs?${serialized}`)
    }
  }, [filters, viewId, selectedRunId])

  // Ensure the 'type' filter is always the first filter and re-add it if it was removed
  useEffect(() => {
    const typeFilter = filters.find((filter) => filter.id === "type")
    if (!typeFilter) {
      const newFilters = filters[0] === "AND" ? filters : ["AND", ...filters]
      setChecks([
        newFilters[0],
        { id: "type", params: { type } },
        ...newFilters.slice(1),
      ])
    }
  }, [filters])

  useEffect(() => {
    // restore filters and selected log from query params
    try {
      const urlParams = new URLSearchParams(window.location.search)

      const selectedId = urlParams.get("selected")
      setSelectedRunId(selectedId)

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

      const viewIdParam = urlParams.get("view")
      setViewId(viewIdParam || undefined)
    } catch (e) {
      console.error(e)
    }
  }, [router.asPath])

  useEffect(() => {
    if (selectedRunId) {
      router.push({
        pathname: router.pathname,
        query: { ...router.query, selected: selectedRunId },
      })
    } else {
      const { selected, ...query } = router.query

      router.push({
        pathname: router.pathname,
        query,
      })
    }
  }, [selectedRunId])

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

  useDidUpdate(() => {
    if (view?.columns) {
      setVisibleColumns(view.columns)
    }
  }, [view])

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

  function exportButton(url: string) {
    return {
      component: "a",
      onClick: () => {
        analytics.trackOnce("ClickExport")

        if (org?.plan === "free") {
          openUpgrade("export")
          return
        }

        // TODO: Remove once OpenAI supports
        if (url.includes("exportType=ojsonl")) {
          modals.open({
            title: "Tool calls removed",
            children: (
              <>
                <Text size="sm">
                  Note: OpenAI fine-tunes currently do not support tool calls in
                  the JSONL fine-tuning format. They will be removed from the
                  export to ensure it does not break the import.
                </Text>
                <Button fullWidth onClick={() => modals.closeAll()} mt="md">
                  Acknowledge
                </Button>
              </>
            ),
          })
        }

        fetcher.getFile(url)
      },
    }
  }

  async function saveView() {
    if (!viewId) {
      const newView = await insertView({
        name: "New View",
        data: filters,
        columns: visibleColumns,
      })

      setViewId(newView.id)
    } else {
      await updateView({
        data: filters,
        columns: visibleColumns,
      })

      notifications.show({
        title: "View saved",
        message: "Your view has been saved.",
      })
    }

    setColumnsTouched(false)
  }

  async function deleteView() {
    modals.openConfirmModal({
      title: "Please confirm your action",
      confirmProps: { color: "red" },
      children: (
        <Text size="sm">
          Are you sure you want to delete this view? This cannot be undone.
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      onConfirm: async () => {
        await removeView(view.id)
        router.push("/logs")
      },
    })
  }

  async function duplicateView() {
    if (view) {
      const newView = await insertView({
        name: `Copy of ${view.name}`,
        data: view.data,
        columns: view.columns,
      })

      notifications.show({
        title: "View duplicated",
        message: `A copy of the view has been created with the name "Copy of ${view.name}".`,
      })

      setViewId(newView.id)
    }
  }

  // Show button if column changed or view has changes, or it's not a view
  const showSaveView =
    columnsTouched ||
    (filters.length > 2 &&
      (!view || JSON.stringify(view.data) !== JSON.stringify(filters)))

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

                    {type === "llm" && (
                      <Menu.Item
                        color="dimmed"
                        disabled={type === "thread"}
                        leftSection={<IconBrandOpenai size={16} />}
                        {...exportButton(exportUrl + "&exportType=ojsonl")}
                      >
                        Export to OpenAI JSONL
                      </Menu.Item>
                    )}

                    <Menu.Item
                      color="dimmed"
                      disabled={type === "thread"}
                      leftSection={<IconBraces size={16} />}
                      {...exportButton(exportUrl + "&exportType=jsonl")}
                    >
                      Export to raw JSONL
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Flex>
          </Card>

          <Group justify="space-between" align="center">
            <Group>
              {view && (
                <Group>
                  <RenamableField
                    defaultValue={view.name}
                    onRename={(newName) => {
                      updateView({
                        name: newName,
                      })
                    }}
                  />
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="light">
                        <IconDotsVertical size={12} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconCopy size={16} />}
                        onClick={() => duplicateView()}
                      >
                        Duplicate
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={() => deleteView()}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              )}
              <CheckPicker
                minimal
                value={filters}
                onChange={setChecks}
                restrictTo={(f) => CHECKS_BY_TYPE[type].includes(f.id)}
              />
            </Group>
            {!!showSaveView && (
              <Button
                leftSection={<IconLayersIntersect size={16} />}
                size="xs"
                onClick={() => saveView()}
                variant="default"
                loading={isInsertingView}
              >
                Save View
              </Button>
            )}
          </Group>
        </Stack>

        <Drawer
          opened={!!selectedRunId}
          size="xl"
          keepMounted
          position="right"
          title={selectedRun ? formatDateTime(selectedRun.createdAt) : ""}
          onClose={() => setSelectedRunId(null)}
        >
          {runLoading ? (
            <Loader />
          ) : (
            <>
              {selectedRun?.type === "llm" && (
                <RunInputOutput
                  initialRun={selectedRun}
                  withFeedback={true}
                  withPlayground={true}
                  withImportToDataset={true}
                  withShare={true}
                  mutateLogs={mutate}
                />
              )}
              {selectedRun?.type === "thread" && (
                <ChatReplay run={selectedRun} mutateLogs={mutate} />
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
              setSelectedRunId(row.id)
            }
          }}
          loading={loading || validating}
          loadMore={loadMore}
          availableColumns={columns[type]}
          visibleColumns={visibleColumns}
          setVisibleColumns={(newState) => {
            setVisibleColumns(newState)
            setColumnsTouched(true)
          }}
          data={logs}
        />
      </Stack>
    </Empty>
  )
}
