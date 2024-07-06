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
  IconLayersIntersect,
  IconTrash,
  IconCopy,
} from "@tabler/icons-react"

import { NextSeo } from "next-seo"
import { use, useContext, useEffect, useMemo, useState } from "react"

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

import { useDebouncedState } from "@mantine/hooks"
import { ProjectContext } from "@/utils/context"

import { useRouter } from "next/router"
import { modals } from "@mantine/modals"
import { useView, useViews } from "@/utils/dataHooks/views"
import RenamableField from "@/components/blocks/RenamableField"
import { VisibilityState } from "@tanstack/react-table"
import { notifications } from "@mantine/notifications"
import { useChecksFromURL, useStateFromURL } from "@/utils/hooks"

export const logsColumns = {
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

export const CHECKS_BY_TYPE = {
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

  const { checks, setChecks, serializedChecks } = useChecksFromURL(
    ["AND", { id: "type", params: { type: "llm" } }],
    ["view", "selected", "search"],
  )

  const { insert: insertView, isInserting: isInsertingView } = useViews()

  const [visibleColumns, setVisibleColumns] = useState<VisibilityState>()
  const [columnsTouched, setColumnsTouched] = useState(false)

  const [viewId, setViewId] = useStateFromURL<string | undefined>("view")
  const [selectedRunId, setSelectedRunId] = useStateFromURL<string | undefined>(
    "selected",
  )
  const [type, setType] = useStateFromURL<string>("type", "llm")

  const { view, update: updateView, remove: removeView } = useView(viewId)

  const [query, setQuery] = useDebouncedState<string | null>(null, 300)

  const {
    data: logs,
    loading,
    validating,
    loadMore,
    mutate,
  } = useProjectInfiniteSWR(`/runs?${serializedChecks}`)

  const { run: selectedRun, loading: runLoading } = useRun(selectedRunId)

  useEffect(() => {
    if (selectedRun && selectedRun.projectId !== projectId) {
      setProjectId(selectedRun.projectId)
    }
  }, [selectedRun?.projectId])

  useEffect(() => {
    // Add type filter if not present
    const typeFilter = checks.find((filter) => filter.id === "type")
    if (!typeFilter) {
      const newFilters = checks[0] === "AND" ? checks : ["AND", ...checks]
      setChecks([
        newFilters[0],
        { id: "type", params: { type } },
        ...newFilters.slice(1),
      ])
    }

    const newChecks = editCheck(checks, "type", { type }).filter(
      (f) =>
        f === "AND" ||
        CHECKS_BY_TYPE[type].includes(f.id) ||
        ["type", "search"].includes(f.id),
    )
    setChecks(newChecks)

    if (view?.columns) {
      setVisibleColumns(view.columns)
    }

    const searchChecks = editCheck(
      checks,
      "search",
      query?.length ? { query } : null,
    )
    setChecks(searchChecks)
  }, [type, view, query])

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
        data: checks,
        columns: visibleColumns,
      })

      setViewId(newView.id)
    } else {
      await updateView({
        data: checks,
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
  const showSaveView = useMemo(
    () =>
      columnsTouched ||
      (checks.length > 2 &&
        (!view || JSON.stringify(view.data) !== JSON.stringify(checks))),
    [columnsTouched, checks, view],
  )

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
                <Group gap="xs">
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
                      <ActionIcon variant="subtle">
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
                value={checks}
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
          availableColumns={logsColumns[type]}
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
