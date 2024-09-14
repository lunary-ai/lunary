import DataTable from "@/components/blocks/DataTable";
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";

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
} from "@mantine/core";

import {
  costColumn,
  durationColumn,
  enrichmentColumn,
  feedbackColumn,
  inputColumn,
  nameColumn,
  outputColumn,
  tagsColumn,
  templateColumn,
  timeColumn,
  userColumn,
} from "@/utils/datatable";

import {
  IconBraces,
  IconBrandOpenai,
  IconDotsVertical,
  IconFileExport,
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
import Empty from "@/components/layout/Empty";
import { openUpgrade } from "@/components/layout/UpgradeModal";

import analytics from "@/utils/analytics";
import {
  useOrg,
  useProject,
  useProjectInfiniteSWR,
  useRun,
  useUser,
} from "@/utils/dataHooks";
import { fetcher } from "@/utils/fetcher";
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
import { useEnrichers } from "@/utils/dataHooks/evaluators";
import { deserializeLogic, hasAccess, serializeLogic } from "shared";
import { useSortParams } from "@/utils/hooks";

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
    inputColumn("Prompt"),
    outputColumn("Result"),
    tagsColumn(),
    feedbackColumn(),
    templateColumn(),
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
};

export const CHECKS_BY_TYPE = {
  llm: [
    "date",
    "models",
    "tags",
    "users",
    "languages",
    "entities",
    "templates",
    "sentiment",
    "status",
    "metadata",
    "feedback",
    "cost",
    "duration",
    "tokens",
  ],
  trace: [
    "date",
    "tags",
    "users",
    "status",
    // "feedback",
    "duration",
    "metadata",
  ],
  thread: [
    "date",
    "tags",
    "users",
    // "feedback",
    "metadata",
  ],
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

  const [selectedRunId, setSelectedRunId] = useQueryState<string | undefined>(
    "selected",
    parseAsString,
  );
  const [type, setType] = useQueryState<string>(
    "type",
    parseAsStringEnum(["llm", "trace", "thread"]).withDefault(
      (router.query.type as NonNullable<"llm" | "trace" | "thread">) || "llm",
    ),
  );

  const [checks, setChecks] = useQueryState("filters", {
    parse: (value) => deserializeLogic(value, true),
    serialize: serializeLogic,
    defaultValue: DEFAULT_CHECK,
    clearOnDefault: true,
  });

  const { sortParams } = useSortParams();

  const {
    view,
    update: updateView,
    remove: removeView,
    loading: viewLoading,
  } = useView(viewId);

  const serializedChecks = useMemo(() => {
    const checksWithType = editCheck(checks, "type", { type });
    return serializeLogic(checksWithType);
  }, [checks, type, view]);

  const { enrichers: evaluators } = useEnrichers();

  const [query, setQuery] = useDebouncedState<string | null>(null, 300);

  const {
    data: logs,
    loading,
    validating,
    loadMore,
    mutate,
  } = useProjectInfiniteSWR(`/runs?${serializedChecks}${sortParams}`);

  const { run: selectedRun, loading: runLoading } = useRun(selectedRunId);

  useEffect(() => {
    if (!hasAccess(user?.role, "settings", "read")) {
      router.push("/analytics");
    }
  }, [user.role]);

  if (!user.role) {
    return <Loader />;
  }

  useEffect(() => {
    const newColumns = { ...allColumns };
    if (type === "llm" && Array.isArray(evaluators)) {
      for (const evaluator of evaluators) {
        const id = "enrichment-" + evaluator.id;

        if (newColumns.llm.map(({ accessorKey }) => accessorKey).includes(id)) {
          continue;
        }

        newColumns.llm.splice(
          3,
          0,
          enrichmentColumn(evaluator.name, evaluator.id, evaluator.type),
        );
      }
      setAllColumns(newColumns);
    }
  }, [type, evaluators]);

  useEffect(() => {
    if (selectedRun && selectedRun.projectId !== projectId) {
      setProjectId(selectedRun.projectId);
    }
  }, [selectedRun?.projectId]);

  useDidUpdate(() => {
    // Update search filter
    if (query !== null) {
      const newChecks = editCheck(
        checks,
        "search",
        query.length ? { query } : null,
      );

      setChecks(newChecks);
    }
  }, [query]);

  useEffect(() => {
    // Update visible columns if view changes
    if (view?.columns) {
      setVisibleColumns(view.columns);
    } else {
      setVisibleColumns(allColumns[type]);
    }
  }, [view, type, allColumns]);

  useEffect(() => {
    if (!view) return;

    setType(view.type || "llm");
    setChecks(view.data || []);
    setVisibleColumns(view.columns);
  }, [view, viewId]);

  const exportUrl = useMemo(
    () => `/runs?${serializedChecks}&projectId=${projectId}`,
    [serializedChecks, projectId],
  );

  function exportButton(url: string) {
    return {
      component: "a",
      onClick: () => {
        analytics.trackOnce("ClickExport");

        if (org?.plan === "free") {
          openUpgrade("export");
          return;
        }

        fetcher.getFile(url);
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

  // Show button if column changed or view has changes, or it's not a view
  const showSaveView = useMemo(
    () =>
      columnsTouched ||
      (checks &&
        checks.length > 1 &&
        (!view || JSON.stringify(view.data) !== JSON.stringify(checks))),
    [columnsTouched, checks, view],
  );

  return (
    <Empty
      enable={
        !viewLoading &&
        !loading &&
        !projectLoading &&
        project &&
        !project.activated
      }
      Icon={IconBrandOpenai}
      title="Waiting for recordings..."
      showProjectId
      description="Once you've setup the SDK, your LLM calls and traces will appear here."
    >
      <Stack h={"calc(100vh - var(--navbar-with-filters-size))"}>
        <NextSeo title="Requests" />

        <Stack>
          <Card withBorder p={2} px="sm">
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
                onChange={setChecks}
                restrictTo={(f) => CHECKS_BY_TYPE[type].includes(f.id)}
              />
            </Group>
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
              analytics.trackOnce("OpenTrace");
              router.push(`/traces/${row.id}`);
            } else {
              analytics.trackOnce("OpenRun");
              setSelectedRunId(row.id);
            }
          }}
          key={allColumns[type].length}
          loading={loading || validating}
          loadMore={loadMore}
          availableColumns={allColumns[type]}
          visibleColumns={visibleColumns}
          setVisibleColumns={(newState) => {
            setVisibleColumns((prev) => ({
              ...prev,
              ...newState,
            }));

            setColumnsTouched(true);
          }}
          data={logs}
        />
      </Stack>
    </Empty>
  );
}
