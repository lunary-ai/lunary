import DataTable from "@/components/blocks/DataTable";
import {
  createParser,
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Drawer,
  Flex,
  Group,
  Loader,
  Menu,
  Select,
  Stack,
  Text,
} from "@mantine/core";

import {
  toxicityColumn,
  costColumn,
  durationColumn,
  enrichmentColumn,
  feedbackColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  scoresColumn,
  selectColumn,
  tagsColumn,
  templateColumn,
  timeColumn,
  userColumn,
  metadataColumn,
} from "@/utils/datatable";

import {
  IconBraces,
  IconBrandOpenai,
  IconCheck,
  IconDotsVertical,
  IconFileExport,
  IconPencil,
  IconStack2,
  IconStackPop,
  IconTrash,
} from "@tabler/icons-react";

import { NextSeo } from "next-seo";
import { useContext, useEffect, useMemo, useState } from "react";

import { ChatReplay } from "@/components/blocks/RunChat";
import RunInputOutput from "@/components/blocks/RunInputOutput";
import SearchBar from "@/components/blocks/SearchBar";
import CheckPicker from "@/components/checks/Picker";
import { EmptyOnboarding } from "@/components/layout/Empty";
import { openUpgrade } from "@/components/layout/UpgradeModal";

import analytics from "@/utils/analytics";
import {
  useDatasets,
  useDeleteRunById,
  useOrg,
  useProject,
  useProjectInfiniteSWR,
  useRun,
  useUser,
  useMetadataKeys,
} from "@/utils/dataHooks";
import { buildUrl, fetcher } from "@/utils/fetcher";
import errorHandler from "@/utils/errors";
import { formatDateTime } from "@/utils/format";

import { ProjectContext } from "@/utils/context";
import { useDebouncedState, useDidUpdate } from "@mantine/hooks";

import RenamableField from "@/components/blocks/RenamableField";
import { useView, useViews } from "@/utils/dataHooks/views";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { VisibilityState } from "@tanstack/react-table";
import { useRouter } from "next/router";

import IconPicker from "@/components/blocks/IconPicker";
import { useSortParams } from "@/utils/hooks";
import { deserializeLogic, serializeLogic } from "shared";
import { useEvaluators } from "@/utils/dataHooks/evaluators";

export const defaultColumns = {
  llm: [
    timeColumn("createdAt"),
    nameColumn("Model"),
    durationColumn(),
    userColumn(),
    {
      header: "Tokens",
      size: 100,
      id: "tokens",
      sortingFn: (a, b) => a.tokens.total - b.tokens.total,
      cell: (props) => props.getValue(),
      accessorFn: (row) => row.tokens.total,
    },
    costColumn(),
    inputColumn("Input"),
    outputColumn("Output"),
    tagsColumn(),
    feedbackColumn("llm"),
    templateColumn(),
  ],
  trace: [
    timeColumn("createdAt", "Time"),
    nameColumn("Agent"),
    durationColumn(),
    userColumn(),
    feedbackColumn("traces"),
    tagsColumn(),
    inputColumn("Input"),
    outputColumn("Output"),
  ],
  thread: [
    timeColumn("createdAt", "Started at"),
    userColumn(),
    inputColumn("Last Message"),
    tagsColumn(),
    feedbackColumn("threads"),
  ],
};

export const CHECKS_BY_TYPE = {
  llm: [
    "date",
    "models",
    "tags",
    "users",
    "languages",
    "templates",
    "status",
    "metadata",
    "feedback",
    "cost",
    "duration",
    "topics",
    "tokens",
    "toxicity",
    "pii",
  ],
  trace: [
    "date",
    "tags",
    "users",
    "status",
    "feedback",
    "duration",
    "metadata",
    "scores",
  ],
  thread: ["date", "tags", "users", "feedback", "metadata"],
};

const VIEW_ICONS = {
  llm: "IconBrandOpenai",
  thread: "IconMessages",
  trace: "IconBinaryTree2",
};

function editCheck(filters, id, params) {
  if (!params) {
    // Remove filter
    return filters.filter((f) => f.id !== id);
  }

  const newChecks = [...filters];
  const index = newChecks.findIndex((f) => f.id === id);
  if (index === -1) {
    newChecks.push({ id, params });
  } else {
    newChecks[index] = { id, params };
  }
  return newChecks;
}

const DEFAULT_CHECK = ["AND"];

const parser = createParser({
  parse: deserializeLogic,
  serialize: serializeLogic,
});

export default function Logs() {
  const router = useRouter();
  const { user } = useUser();
  const { projectId } = useContext(ProjectContext);
  const { project, isLoading: projectLoading, setProjectId } = useProject();
  const { org } = useOrg();

  const { insert: insertView, isInserting: isInsertingView } = useViews();

  const [allColumns, setAllColumns] = useState(defaultColumns);

  const [visibleColumns, setVisibleColumns] = useState<VisibilityState>({});
  const [columnsTouched, setColumnsTouched] = useState(false);

  const [viewId, setViewId] = useQueryState<string | undefined>("view", {
    ...parseAsString,
    history: "push",
  });

  const [shouldMutate, setShouldMutate] = useQueryState<boolean | undefined>(
    "mutate",
    parseAsBoolean,
  );

  const [selectedRunId, setSelectedRunId] = useQueryState<string | undefined>(
    "selected",
    parseAsString,
  );

  const [type, setType] = useQueryState<string>(
    "type",
    parseAsStringEnum(["llm", "trace", "thread"]).withDefault("llm"),
  );

  const [checks, setChecks] = useQueryState(
    "filters",
    parser.withDefault(DEFAULT_CHECK).withOptions({ clearOnDefault: true }),
  );

  const { deleteRun: deleteRunById } = useDeleteRunById();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const { sortParams } = useSortParams();

  const {
    view,
    update: updateView,
    remove: removeView,
    loading: viewLoading,
  } = useView(viewId);

  useEffect(() => {
    const savedVisibility = localStorage.getItem(`columnVisibility-${type}`);
    if (savedVisibility && !view) {
      try {
        const parsed = JSON.parse(savedVisibility);
        setVisibleColumns(parsed);
      } catch (e) {
        console.error("Failed to parse saved column visibility", e);
      }
    }
  }, [type, view]);

  const serializedChecks = useMemo(() => {
    const checksWithType = editCheck(checks, "type", { type });
    return serializeLogic(checksWithType);
  }, [checks, type, view]);

  const { evaluators } = useEvaluators();
  const { metadataKeys } = useMetadataKeys(type);

  const [query, setQuery] = useDebouncedState<string | null>(null, 300);
  const [searchMode, setSearchMode] = useState<"keyword" | "ai">("keyword");
  const [searchValue, setSearchValue] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiUnmatched, setAiUnmatched] = useState<string[]>([]);
  const [aiHints, setAiHints] = useState<string | undefined>();

  useEffect(() => {
    if (searchMode === "keyword") {
      setSearchValue(query ?? "");
    }
  }, [searchMode, query]);

  const {
    data: logs,
    isLoading: runsLoading,
    isValidating: runsValidating,
    loadMore,
    mutate: mutateLogs,
  } = useProjectInfiniteSWR(`/runs?${serializedChecks}${sortParams}`, {
    refreshInterval: 1000,
  });

  const { datasets, insertPrompts } = useDatasets();

  useEffect(() => {
    if (shouldMutate) {
      mutateLogs();
      setShouldMutate(null);
    }
  }, [shouldMutate]);

  const {
    run: selectedRun,
    loading: runLoading,
    deleteRun,
  } = useRun(selectedRunId);

  if (!user.role) {
    return <Loader />;
  }

  const sameCols = (a, b) =>
    a.length === b.length && a.every((c, i) => c.id === b[i].id);

  useEffect(() => {
    setAllColumns((prev) => {
      const next: typeof prev = { ...prev, llm: [...prev.llm] };

      next.llm = next.llm.filter(
        (col) =>
          !(type === "llm" && col.accessorKey?.startsWith("enrichment-")),
      );

      if (type === "llm") {
        if (Array.isArray(evaluators)) {
          evaluators.forEach((ev) => {
            next.llm.push(
              ev.type === "toxicity"
                ? toxicityColumn(ev.id)
                : enrichmentColumn(ev.name, ev.id, ev.type),
            );
          });
        }
      } else if (next.llm[0]?.id === "select") {
        next.llm.shift();
      }

      return sameCols(prev.llm, next.llm) ? prev : next;
    });
  }, [type, evaluators, isSelectMode, setAllColumns]);

  useEffect(() => {
    setAllColumns((prev) => {
      const next: typeof prev = { ...prev, [type]: [...prev[type]] };

      if (isSelectMode) {
        next[type].unshift(selectColumn());
      } else {
        next[type] = next[type].filter((col) => col.id !== "select");
      }
      return sameCols(prev[type], next[type]) ? prev : next;
    });
  }, [isSelectMode, type, setAllColumns]);

  useEffect(() => {
    if (!Array.isArray(metadataKeys)) return;

    setAllColumns((prev) => {
      const next: typeof prev = {
        llm: [...prev.llm],
        trace: [...prev.trace],
        thread: [...prev.thread],
      };

      next.thread = next.thread.filter(
        (col) => !col.id?.startsWith("metadata-"),
      );

      if (metadataKeys.length > 0 && type === "thread") {
        const newMetadataColumns = metadataKeys.map((key) =>
          metadataColumn(key),
        );
        next.thread = [...next.thread, ...newMetadataColumns];

        // If we're adding new metadata columns and there's no saved visibility state,
        // ensure they are hidden by default
        if (!view && !localStorage.getItem(`columnVisibility-${type}`)) {
          setVisibleColumns((prev) => {
            const updated = { ...prev };
            newMetadataColumns.forEach((col) => {
              if (col.id && !(col.id in updated)) {
                updated[col.id] = false;
              }
            });
            return updated;
          });
        }
      }

      const hasChanged = !sameCols(prev.thread, next.thread);

      return hasChanged ? next : prev;
    });
  }, [metadataKeys, type, view]);

  useEffect(() => {
    if (selectedRun && selectedRun.projectId !== projectId) {
      setProjectId(selectedRun.projectId);
    }
  }, [selectedRun?.projectId]);

  useDidUpdate(() => {
    setChecks((prev) =>
      editCheck(prev, "search", query && query.length ? { query } : null),
    );
    if (searchMode === "keyword") {
      analytics.track("LogsSearchKeyword", {
        query: query ?? "",
        type,
        empty: !query,
      });
    }
  }, [query, searchMode, type]);

  useEffect(() => {
    // Update visible columns if view changes
    if (view?.columns) {
      setVisibleColumns(view.columns);
    } else if (
      allColumns[type] &&
      !localStorage.getItem(`columnVisibility-${type}`)
    ) {
      // Only update if columns exist and are different
      setVisibleColumns((prev) => {
        const newColumns = {};
        allColumns[type].forEach((col) => {
          if (col.id) {
            // Hide metadata columns by default
            if (col.id.startsWith("metadata-")) {
              newColumns[col.id] = false;
            } else {
              newColumns[col.id] = prev[col.id] !== false;
            }
          }
        });
        return newColumns;
      });
    }
  }, [view, type]);

  useEffect(() => {
    if (!view) return;

    setType(view.type || "llm");
    setChecks(view.data || []);
    setVisibleColumns(view.columns);
  }, [view, viewId]);

  useEffect(() => {
    setIsSelectMode(false);
  }, [type]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);

    if (searchMode === "keyword") {
      setQuery(value);
    } else {
      if (aiError) setAiError(null);
      if (aiUnmatched.length) setAiUnmatched([]);
      setAiHints(undefined);
    }
  };

  const handleSearchModeChange = (mode: "keyword" | "ai") => {
    if (mode === searchMode) return;
    setSearchMode(mode);
    setAiError(null);
    setAiUnmatched([]);
    setAiHints(undefined);

    if (mode === "keyword") {
      const next = query ?? "";
      setSearchValue(next);
    } else {
      setQuery(null);
      setSearchValue("");
    }
  };

  async function applyNaturalLanguageFilters() {
    const trimmed = searchValue.trim();
    if (!trimmed || aiLoading) {
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiUnmatched([]);

    try {
      const response = await fetcher.post("/filters/natural-language", {
        arg: { text: trimmed, type },
      });

      if (!response || !Array.isArray(response.logic)) {
        throw new Error(
          "Unexpected response from natural language filters endpoint",
        );
      }

      const logic = response.logic as unknown as any[];
      setChecks(logic);

      const typeLeaf = logic.find(
        (item) => item?.id === "type" && typeof item?.params === "object",
      );
      const inferredType = typeLeaf?.params?.type;
      if (
        typeof inferredType === "string" &&
        inferredType !== type &&
        ["llm", "trace", "thread"].includes(inferredType)
      ) {
        setType(inferredType);
      }

      setAiUnmatched(response?.debug?.unmatched ?? []);
      setAiHints(response?.debug?.hints);

      analytics.track("LogsSearchAskAI", {
        query: trimmed,
        type,
        inferredType,
        heuristicsCount: response?.debug?.heuristics?.length ?? 0,
        unmatchedCount: response?.debug?.unmatched?.length ?? 0,
        hadHints: Boolean(response?.debug?.hints),
      });

      if (response?.debug?.unmatched?.length) {
        analytics.track("LogsNaturalLanguageUnmatched", {
          count: response.debug.unmatched.length,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't convert your request. Try rephrasing it.";

      setAiError(message);
      setAiHints(undefined);
      errorHandler(error);
      notifications.show({
        title: "Ask AI search failed",
        message,
        color: "red",
      });
      analytics.track("LogsSearchAskAIError", {
        query: trimmed,
        type,
        message,
      });
    } finally {
      setAiLoading(false);
    }
  }

  function exportButton({ serializedChecks, projectId, type, format }) {
    return {
      component: "a",
      onClick: async () => {
        analytics.trackOnce("ClickExport");

        if (org?.plan === "free") {
          openUpgrade("export");
          return;
        }

        const { token } = await fetcher.post("/runs/generate-export-token");
        const url = buildUrl(
          `/runs/exports/${token}?${serializedChecks}&projectId=` +
            `${projectId}&exportFormat=${format}`,
        );
        window.open(url, "_blank");
      },
    };
  }

  async function saveView() {
    if (!viewId) {
      const icon = VIEW_ICONS[type];

      const newView = await insertView({
        name: "New View",
        type,
        data: checks,
        columns: visibleColumns,
        icon,
      });

      setViewId(newView.id);
    } else {
      await updateView({
        data: checks,
        columns: visibleColumns,
      });

      notifications.show({
        title: "View saved",
        message: "Your view has been saved.",
      });
    }

    setColumnsTouched(false);
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
        await removeView(view.id);
        router.push("/logs");
      },
    });
  }

  async function duplicateView() {
    if (view) {
      const newView = await insertView({
        name: `Copy of ${view.name}`,
        type: view.type,
        data: view.data,
        columns: view.columns,
        icon: view.icon,
      });

      notifications.show({
        title: "View duplicated",
        message: `A copy of the view has been created with the name "Copy of ${view.name}".`,
      });

      setViewId(newView.id);
    }
  }

  function openBulkDeleteModal() {
    modals.openConfirmModal({
      title: "Delete Logs",
      confirmProps: { color: "red" },
      children: (
        <Text size="sm">
          Are you sure you want to delete the selected {selectedRows.length}{" "}
          rows? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      onConfirm: async () => {
        await Promise.all(selectedRows.map((id) => deleteRunById(id)));
        setIsSelectMode(false);
        setShouldMutate(true);

        notifications.show({
          title: "Resources deleted successfully",
          message: "",
          icon: <IconCheck />,
          color: "green",
        });
      },
    });
  }

  // Show button if column changed or view has changes, or it's not a view
  const showSaveView = useMemo(
    () =>
      columnsTouched ||
      (checks &&
        checks.length > 1 &&
        (!view || JSON.stringify(view.data) !== JSON.stringify(checks))),
    [columnsTouched, checks, view],
  );

  if (
    !viewLoading &&
    !runsLoading &&
    !projectLoading &&
    project &&
    !project.activated
  ) {
    return <EmptyOnboarding />;
  }

  return (
    <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
      <NextSeo title="Requests" />

      <Stack>
        <Card withBorder p={2} px="sm">
          <Stack gap="xs">
            <Flex justify="space-between" align="center" gap="sm" wrap="wrap">
              <SearchBar
                value={searchValue}
                mode={searchMode}
                onModeChange={handleSearchModeChange}
                onChange={handleSearchChange}
                onSubmit={
                  searchMode === "ai" ? applyNaturalLanguageFilters : undefined
                }
                loading={searchMode === "ai" ? aiLoading : false}
                variant="unstyled"
                size="sm"
                maw={470}
                w="100%"
                style={{ flex: "1 1 360px", maxWidth: 520 }}
              />

              <Group gap="xs">
                <Menu position="bottom-end" data-testid="export-menu">
                  <Menu.Target>
                    <ActionIcon variant="light">
                      <IconDotsVertical size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      data-testid="export-openai-jsonl-button"
                      color="dimmed"
                      leftSection={<IconPencil size={16} />}
                      onClick={() => setIsSelectMode((prev) => !prev)}
                    >
                      {!isSelectMode ? "Select Mode" : "Exit Select Mode"}
                    </Menu.Item>

                    <Menu.Item
                      data-testid="export-csv-button"
                      leftSection={<IconFileExport size={16} />}
                      {...exportButton({
                        serializedChecks,
                        projectId,
                        type,
                        format: "csv",
                      })}
                    >
                      Export to CSV
                    </Menu.Item>

                    {type === "llm" && (
                      <Menu.Item
                        data-testid="export-openai-jsonl-button"
                        color="dimmed"
                        leftSection={<IconBrandOpenai size={16} />}
                        {...exportButton({
                          serializedChecks,
                          projectId,
                          type,
                          format: "ojsonl",
                        })}
                      >
                        Export to OpenAI JSONL
                      </Menu.Item>
                    )}

                    <Menu.Item
                      data-testid="export-raw-jsonl-button"
                      color="dimmed"
                      leftSection={<IconBraces size={16} />}
                      {...exportButton({
                        serializedChecks,
                        projectId,
                        type,
                        format: "jsonl",
                      })}
                    >
                      Export to raw JSONL
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Flex>
          </Stack>
        </Card>

        <Group justify="space-between" align="center">
          <Group>
            {view && (
              <Group gap="xs">
                <IconPicker
                  size={26}
                  variant="light"
                  value={view.icon}
                  onChange={(icon) => {
                    updateView({
                      icon,
                    });
                  }}
                />
                <RenamableField
                  defaultValue={view.name}
                  onRename={(newName) => {
                    updateView({
                      name: newName,
                    });
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
                      leftSection={<IconStackPop size={16} />}
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
              onChange={(value) => {
                setChecks(value);
              }}
              restrictTo={(f) => CHECKS_BY_TYPE[type].includes(f.id)}
            />
          </Group>
          <Group>
            {!!showSaveView && (
              <Button
                leftSection={<IconStack2 size={16} />}
                size="xs"
                onClick={() => saveView()}
                variant="default"
                loading={isInsertingView}
              >
                Save View
              </Button>
            )}

            {isSelectMode && (
              <Group>
                {type === "llm" && (
                  <Select
                    searchable
                    size="xs"
                    placeholder={
                      datasets.length === 0 ? "No datasets" : "Add to dataset"
                    }
                    w={160}
                    data={datasets?.map((d) => ({
                      label: d.slug,
                      value: d.id,
                    }))}
                    disabled={
                      selectedRows.length === 0 || datasets.length === 0
                    }
                    onChange={async (datasetId) => {
                      if (selectedRows.length === 0) return;

                      await insertPrompts({
                        datasetId: datasetId,
                        runIds: selectedRows,
                      });
                      setIsSelectMode(false);
                      notifications.show({
                        title: "The runs has been added to the dataset",
                        message: "",
                        icon: <IconCheck />,
                        color: "green",
                      });
                    }}
                  />
                )}
                <Button
                  size="xs"
                  color="red"
                  disabled={selectedRows.length === 0}
                  onClick={openBulkDeleteModal}
                >
                  Delete selection
                </Button>
              </Group>
            )}
          </Group>
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
                withOpenTrace={true}
                withShare={true}
                mutateLogs={mutateLogs}
              />
            )}
            {selectedRun?.type === "thread" && (
              <ChatReplay
                run={selectedRun}
                mutateLogs={mutateLogs}
                deleteRun={deleteRun}
              />
            )}
          </>
        )}
      </Drawer>

      <DataTable
        type={type}
        onRowClicked={(row, event) => {
          const rowData = row.original;
          const isSecondaryClick =
            event.metaKey || event.ctrlKey || event.button === 1;

          if (["agent", "chain"].includes(rowData.type) && !isSelectMode) {
            analytics.trackOnce("OpenTrace");

            if (!isSecondaryClick) {
              router.push({
                pathname: `/traces/${rowData.id}`,
                query: { checks: serializedChecks, sortParams },
              });
            } else {
              window.open(
                `/traces/${rowData.id}?checks=${serializedChecks}&sortParams=${sortParams}`,
                "_blank",
              );
            }
          } else {
            if (isSelectMode) {
              row.toggleSelected();
            } else {
              analytics.trackOnce("OpenRun");
              setSelectedRunId(rowData.id);
            }
          }
        }}
        key={`${type}-${allColumns[type].map((c) => c.id).join(",")}`}
        loading={runsLoading || runsValidating}
        loadMore={loadMore}
        isSelectMode={isSelectMode}
        availableColumns={allColumns[type]}
        visibleColumns={visibleColumns}
        setVisibleColumns={(newState) => {
          const next = { ...visibleColumns, ...newState };

          const hasMeaningfulChange = Object.keys(next).some(
            (key) => key !== "select" && next[key] !== visibleColumns[key],
          );

          setVisibleColumns((prev) => ({ ...prev, ...newState }));

          if (hasMeaningfulChange) {
            // Only set columnsTouched if non-metadata columns changed
            const nonMetadataColumnChanged = Object.keys(next).some(
              (key) =>
                key !== "select" &&
                !key.startsWith("metadata-") &&
                next[key] !== visibleColumns[key],
            );

            if (nonMetadataColumnChanged) {
              setColumnsTouched(true);
            }

            // Save column visibility to localStorage when not in a view
            if (!view) {
              localStorage.setItem(
                `columnVisibility-${type}`,
                JSON.stringify(next),
              );
            }
          }
        }}
        data={logs}
        setSelectedRows={setSelectedRows}
      />
    </Stack>
  );
}
