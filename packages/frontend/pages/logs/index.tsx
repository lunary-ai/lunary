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
  costColumn,
  durationColumn,
  enrichmentColumn,
  feedbackColumn,
  inputColumn,
  messageCountColumn,
  messagePreviewColumn,
  metadataColumn,
  nameColumn,
  outputColumn,
  selectColumn,
  tagsColumn,
  templateColumn,
  timeColumn,
  toxicityColumn,
  userColumn,
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

import { NextSeo } from "@/utils/seo";
import { useContext, useEffect, useMemo, useState } from "react";

import { ChatReplay } from "@/components/blocks/RunChat";
import RunInputOutput from "@/components/blocks/RunInputOutput";
import SearchBar from "@/components/blocks/SearchBar";
import AiFilterSkeleton from "@/components/checks/ai-filter-skeleton";
import CheckPicker from "@/components/checks/Picker";
import { EmptyOnboarding } from "@/components/layout/Empty";
import { openUpgrade } from "@/components/layout/UpgradeModal";

import { LOGS_AI_FILTER_EXAMPLES } from "@/utils/ai-filters";
import analytics from "@/utils/analytics";
import {
  useDatasets,
  useDeleteRunById,
  useMetadataKeys,
  useOrg,
  useProject,
  useProjectInfiniteSWR,
  useRun,
  useUser,
} from "@/utils/dataHooks";
import { buildUrl, fetcher } from "@/utils/fetcher";
import { formatDateTime } from "@/utils/format";
import { useAiFilter } from "@/utils/useAiFilter";

import { ProjectContext } from "@/utils/context";
import { useDebouncedState, useDidUpdate } from "@mantine/hooks";

import RenamableField from "@/components/blocks/RenamableField";
import { useView, useViews } from "@/utils/dataHooks/views";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { VisibilityState } from "@tanstack/react-table";
import { useRouter } from "next/router";

import IconPicker from "@/components/blocks/IconPicker";
import { useEvaluators } from "@/utils/dataHooks/evaluators";
import { useSortParams } from "@/utils/hooks";
import { deserializeLogic, serializeLogic } from "shared";
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
    messageCountColumn("messagesCount", "Messages"),
    userColumn(),
    messagePreviewColumn("firstMessage", "First Message"),
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
  thread: ["date", "messages", "tags", "users", "feedback", "metadata"],
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
  const { evaluators } = useEvaluators();

  const hasIntentEvaluator = useMemo(
    () => evaluators.some((ev) => ev.type === "intent"),
    [evaluators],
  );

  const checksByType = useMemo(() => {
    const base = {
      llm: [...CHECKS_BY_TYPE.llm],
      trace: [...CHECKS_BY_TYPE.trace],
      thread: [...CHECKS_BY_TYPE.thread],
    };

    if (org?.beta && hasIntentEvaluator && !base.thread.includes("intents")) {
      base.thread.push("intents");
    }

    return base;
  }, [org?.beta, hasIntentEvaluator]);

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

  const { metadataKeys } = useMetadataKeys(type);

  const [query, setQuery] = useDebouncedState<string | null>(null, 300);
  const [searchValue, setSearchValue] = useState("");
  const { applyAiFilter, isAiFilterLoading } = useAiFilter({ projectId });
  const aiLoading = isAiFilterLoading();

  useEffect(() => {
    setSearchValue(query ?? "");
  }, [query]);

  const {
    data: logs,
    isLoading: runsLoading,
    isValidating: runsValidating,
    loadMore,
    mutate: mutateLogs,
  } = useProjectInfiniteSWR(`/runs?${serializedChecks}${sortParams}`, {
    refreshInterval: 5000,
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
      const next: typeof prev = {
        llm: [...prev.llm],
        trace: [...prev.trace],
        thread: [...prev.thread],
      };

      next.llm = next.llm.filter(
        (col) =>
          !(type === "llm" && col.accessorKey?.startsWith("enrichment-")),
      );

      next.thread = next.thread.filter(
        (col) => !(type === "thread" && col.id?.startsWith("enrichment-")),
      );

      if (Array.isArray(evaluators)) {
        if (type === "llm") {
          evaluators.forEach((ev) => {
            if (!org?.beta && ev.type === "intent") return;
            next.llm.push(
              ev.type === "toxicity"
                ? toxicityColumn(ev.id)
                : enrichmentColumn(ev.name, ev.id, ev.type),
            );
          });
        }

        if (type === "thread" && org?.beta) {
          evaluators
            .filter((ev) => ev.type === "intent")
            .forEach((ev) => {
              next.thread.push(enrichmentColumn(ev.name, ev.id, ev.type));
            });
        }
      }

      if (type === "llm" && next.llm[0]?.id === "select") {
        next.llm.shift();
      }

      const unchanged =
        sameCols(prev.llm, next.llm) && sameCols(prev.thread, next.thread);

      return unchanged ? prev : next;
    });
  }, [type, evaluators, org?.beta, setAllColumns]);

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

  useEffect(() => {
    if (query) {
      return;
    }

    setSearchValue("");
  }, [projectId, type, serializedChecks, query]);

  useDidUpdate(() => {
    setChecks((prev) =>
      editCheck(prev, "search", query && query.length ? { query } : null),
    );
    analytics.track("LogsSearchKeyword", {
      query: query ?? "",
      type,
      empty: !query,
    });
  }, [query, type]);

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
    setSearchValue("");
    setQuery(null);
  }, [view, viewId]);

  useEffect(() => {
    setIsSelectMode(false);
  }, [type]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);

    setQuery(value);
  };

  async function applyNaturalLanguageFilters(request: string) {
    const trimmed = request.trim();
    if (!trimmed || aiLoading) {
      return;
    }

    setQuery(null);
    setSearchValue("");

    await applyAiFilter(trimmed, {
      type,
      notifyOnError: false,
      onSuccess: (result) => {
        const logic = result.logic as unknown as any[];
        setChecks(logic);

        const inferredType = result.inferredType;
        if (
          inferredType &&
          inferredType !== type &&
          ["llm", "trace", "thread"].includes(inferredType)
        ) {
          setType(inferredType);
        }

        const unmatched = Array.isArray(result.debug?.unmatched)
          ? (result.debug?.unmatched as string[])
          : [];
        const hints =
          typeof result.debug?.hints === "string"
            ? (result.debug?.hints as string)
            : undefined;
        const heuristics = Array.isArray(result.debug?.heuristics)
          ? (result.debug?.heuristics as unknown[])
          : [];

        analytics.track("LogsSearchAskAI", {
          query: trimmed,
          type,
          inferredType,
          heuristicsCount: heuristics.length,
          unmatchedCount: unmatched.length,
          hadHints: Boolean(hints),
        });

        if (unmatched.length) {
          analytics.track("LogsNaturalLanguageUnmatched", {
            count: unmatched.length,
          });
        }
      },
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't convert your request. Try rephrasing it.";

        notifications.show({
          title: "AI search failed",
          message,
          color: "red",
        });
        analytics.track("LogsSearchAskAIError", {
          query: trimmed,
          type,
          message,
        });
      },
    }).catch(() => {});
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
      <NextSeo title="Logs - Lunary" />

      <Stack>
        <Card withBorder p={2} px="sm">
          <Stack gap="xs">
            <Flex justify="space-between" align="center" gap="sm" wrap="wrap">
              <SearchBar
                query={searchValue}
                setQuery={handleSearchChange}
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

            {aiLoading ? (
              <AiFilterSkeleton />
            ) : (
              <CheckPicker
                minimal
                value={checks}
                onChange={(value) => {
                  setChecks(value);
                }}
                restrictTo={(f) => checksByType[type].includes(f.id)}
                aiFilter={{
                  onSubmit: applyNaturalLanguageFilters,
                  loading: aiLoading,
                  examples: LOGS_AI_FILTER_EXAMPLES,
                }}
              />
            )}
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
