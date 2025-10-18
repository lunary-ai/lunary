import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue, useHotkeys } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconArrowsVertical,
  IconCopy,
  IconDownload,
  IconMaximize,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import Router, { useRouter } from "next/router";
import { ProjectContext } from "@/utils/context";
import {
  DatasetItemV2,
  DatasetV2,
  useDatasetV2,
  useOrg,
} from "@/utils/dataHooks";
import { fetcher, buildUrl, getHeaders } from "@/utils/fetcher";
import { showErrorNotification } from "@/utils/errors";
import { v4 as uuid } from "uuid";

type DraftState = "clean" | "new" | "updated";
type EditableField = "input" | "expectedOutput";

interface DraftItem {
  id: string;
  datasetId: string;
  createdAt: string;
  input: string;
  expectedOutput: string;
  state: DraftState;
  original: {
    input: string;
    expectedOutput: string;
  };
  errors: Partial<Record<EditableField, string>>;
  isPersisted: boolean;
}

interface CellEditorState {
  itemId: string;
  field: EditableField;
}

const PAGE_SIZE = 1000;

function normalizeInput(value?: string | null) {
  return value ?? "";
}

function normalizeExpectedOutput(value?: string | null) {
  return value ?? "";
}

function prepareFieldValue(field: EditableField, value: string) {
  if (field === "expectedOutput") {
    return value.trim().length ? value : null;
  }
  return value ?? "";
}

function mapItemToDraft(item: DatasetItemV2): DraftItem {
  const inputString = normalizeInput(item.input);
  const expectedString = normalizeExpectedOutput(item.expectedOutput);

  return {
    id: item.id,
    datasetId: item.datasetId,
    createdAt: item.createdAt,
    input: inputString,
    expectedOutput: expectedString,
    state: "clean",
    original: {
      input: inputString,
      expectedOutput: expectedString,
    },
    errors: {},
    isPersisted: true,
  };
}

function generateTempId() {
  return `temp-${uuid()}`;
}

export default function DatasetDetailPage() {
  const router = useRouter();
  const { projectId } = useContext(ProjectContext);
  const datasetId = router.query.id as string | undefined;
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [cellEditor, setCellEditor] = useState<CellEditorState | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<"jsonl" | "csv">("jsonl");
  const [importing, setImporting] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");

  const fetchItems = useCallback(
    async (searchTerm = "") => {
      if (!datasetId || !projectId) return;
      setLoadingItems(true);
      try {
        let currentPage = 1;
        let totalPages = 1;
        const collected: DatasetItemV2[] = [];

        do {
          const params = new URLSearchParams({
            projectId,
            page: String(currentPage),
            pageSize: String(PAGE_SIZE),
          });
          if (searchTerm) {
            params.set("search", searchTerm);
          }

          const response = await fetcher.get(
            `/datasets-v2/${datasetId}/items?${params.toString()}`,
          );

          const pageItems = (response?.data ?? []) as DatasetItemV2[];
          totalPages = response?.totalPages ?? 0;
          collected.push(...pageItems);
          currentPage += 1;
          if (totalPages === 0) break;
        } while (currentPage <= totalPages);

        setItems(
          collected
            .map(mapItemToDraft)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            ),
        );
        setDeletedIds([]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingItems(false);
      }
    },
    [datasetId, projectId],
  );

  const {
    dataset,
    update: updateDataset,
    remove: deleteDataset,
    mutate: mutateDataset,
    isLoading: datasetLoading,
  } = useDatasetV2(datasetId);
  const { org } = useOrg();

  useEffect(() => {
    if (org?.useLegacyDatasets) {
      Router.replace("/legacy-datasets");
    }
  }, [org?.useLegacyDatasets]);

  if (org?.useLegacyDatasets) {
    return null;
  }

  const hasPendingChanges = useMemo(() => {
    if (deletedIds.length > 0) return true;
    return items.some((item) => item.state !== "clean");
  }, [items, deletedIds]);

  useEffect(() => {
    setDescriptionDraft(dataset?.description ?? "");
    setNameDraft(dataset?.name ?? "");
  }, [dataset?.description, dataset?.name]);

  useHotkeys([
    [
      "mod+S",
      (event) => {
        event.preventDefault();
        handleSave();
      },
    ],
  ]);

  useEffect(() => {
    function beforeUnloadHandler(event: BeforeUnloadEvent) {
      if (!hasPendingChanges) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () => window.removeEventListener("beforeunload", beforeUnloadHandler);
  }, [hasPendingChanges]);

  useEffect(() => {
    fetchItems(debouncedSearch);
  }, [fetchItems, debouncedSearch]);

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (allowNavigation || !hasPendingChanges) {
        return;
      }

      if (url === Router.asPath) return;

      Router.events.emit("routeChangeError");
      setPendingNavigation(url);
      modals.openConfirmModal({
        title: "Unsaved changes",
        centered: true,
        children: (
          <Stack gap="xs">
            <Text size="sm">
              You have unsaved changes in this dataset. Do you want to discard
              them?
            </Text>
          </Stack>
        ),
        labels: { confirm: "Discard changes", cancel: "Stay" },
        confirmProps: { color: "red" },
        onConfirm: () => {
          setAllowNavigation(true);
          Router.push(url);
        },
      });
      throw new Error("Route change aborted due to unsaved changes.");
    };

    const handleBeforePopState = ({ url }: { url: string }) => {
      if (allowNavigation || !hasPendingChanges) {
        return true;
      }
      setPendingNavigation(url);
      modals.openConfirmModal({
        title: "Unsaved changes",
        centered: true,
        children: (
          <Text size="sm">
            You have unsaved edits. Leave without saving?
          </Text>
        ),
        labels: { confirm: "Leave", cancel: "Stay" },
        confirmProps: { color: "red" },
        onConfirm: () => {
          setAllowNavigation(true);
          Router.push(url);
        },
      });
      return false;
    };

    Router.events.on("routeChangeStart", handleRouteChangeStart);
    Router.beforePopState(handleBeforePopState);

    return () => {
      Router.events.off("routeChangeStart", handleRouteChangeStart);
      Router.beforePopState(() => true);
    };
  }, [hasPendingChanges, allowNavigation]);

  useEffect(() => {
    if (!allowNavigation || !pendingNavigation) return;
    Router.push(pendingNavigation);
  }, [allowNavigation, pendingNavigation]);

  function handleCellEdit(itemId: string, field: EditableField, value: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const nextErrors = { ...item.errors };
        delete nextErrors[field];

        const nextState: DraftState =
          item.state === "new"
            ? "new"
            : value !== item.original[field]
              ? "updated"
              : Object.values(nextErrors).length > 0
                ? "updated"
                : "clean";

        return {
          ...item,
          [field]: value,
          errors: nextErrors,
          state: nextState,
        };
      }),
    );
  }

  function resetEditor() {
    setCellEditor(null);
  }

  function openCellModal(itemId: string, field: EditableField) {
    setCellEditor({ itemId, field });
  }

  function addRow() {
    if (!datasetId) return;
    const draft: DraftItem = {
      id: generateTempId(),
      datasetId,
      createdAt: new Date().toISOString(),
      input: "",
      expectedOutput: "",
      state: "new",
      original: {
        input: "",
        expectedOutput: "",
      },
      errors: {},
      isPersisted: false,
    };

    setItems((prev) => [...prev, draft]);
  }

  function duplicateItem(itemId: string) {
    const target = items.find((item) => item.id === itemId);
    if (!target) return;

    const duplicate: DraftItem = {
      id: generateTempId(),
      datasetId: target.datasetId,
      createdAt: new Date().toISOString(),
      input: target.input,
      expectedOutput: target.expectedOutput,
      state: "new",
      isPersisted: false,
      errors: {},
      original: {
        input: target.input,
        expectedOutput: target.expectedOutput,
      },
    };

    setItems((prev) => [...prev, duplicate]);
  }

  function deleteItem(itemId: string) {
    const target = items.find((item) => item.id === itemId);
    if (!target) return;

    setItems((prev) => prev.filter((item) => item.id !== itemId));
    if (target.isPersisted) {
      setDeletedIds((prev) => [...prev, itemId]);
    }
  }

  async function handleSave() {
    if (!datasetId) return;

    const createPayload = items
      .filter((item) => item.state === "new")
      .map((item) => ({
        input: prepareFieldValue("input", item.input),
        expectedOutput: prepareFieldValue("expectedOutput", item.expectedOutput),
      }));

    const updatePayload = items
      .filter((item) => item.state === "updated" && item.isPersisted)
      .map((item) => ({
        id: item.id,
        input: prepareFieldValue("input", item.input),
        expectedOutput: prepareFieldValue("expectedOutput", item.expectedOutput),
      }));

    const deletePayload = deletedIds;

    if (
      createPayload.length === 0 &&
      updatePayload.length === 0 &&
      deletePayload.length === 0
    ) {
      notifications.show({
        title: "Nothing to save",
        message: "No changes detected.",
      });
      return;
    }

    try {
      await fetcher.post(
        `/datasets-v2/${datasetId}/items/batch?projectId=${projectId}`,
        {
          arg: {
            create: createPayload,
            update: updatePayload,
            delete: deletePayload,
            duplicate: [],
          },
        },
      );

      notifications.show({
        title: "Saved",
        message: "Dataset items have been saved.",
        color: "teal",
      });

      await mutateDataset();
      setSearch("");
      setAllowNavigation(false);
      await fetchItems();
    } catch (error) {
      console.error(error);
    }
  }

  function handleDiscard() {
    if (!datasetId || !projectId) return;
    setSearch("");
    setAllowNavigation(false);
    setDeletedIds([]);
    fetchItems();
  }

  async function handleDeleteDataset() {
    if (!datasetId || !projectId) return;
    modals.openConfirmModal({
      title: "Delete dataset",
      centered: true,
      confirmProps: { color: "red" },
      children: (
        <Text size="sm">
          Are you sure you want to delete this dataset? This action cannot be
          undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      onConfirm: async () => {
        await deleteDataset();
        Router.push("/datasets");
      },
    });
  }

  function getEditorItem() {
    if (!cellEditor) return null;
    return items.find((item) => item.id === cellEditor.itemId) ?? null;
  }

  function navigateEditor(direction: "prev" | "next") {
    const editorItem = getEditorItem();
    if (!editorItem) return;
    const index = items.findIndex((item) => item.id === editorItem.id);
    if (index === -1) return;
    const nextIndex = direction === "prev" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const nextItem = items[nextIndex];
    setCellEditor({ itemId: nextItem.id, field: cellEditor?.field ?? "input" });
  }

  useHotkeys(
    [
      [
        "ArrowDown",
        () => {
          if (cellEditor) navigateEditor("next");
        },
      ],
      [
        "ArrowUp",
        () => {
          if (cellEditor) navigateEditor("prev");
        },
      ],
      [
        "mod+ArrowRight",
        () => {
          if (cellEditor) navigateEditor("next");
        },
      ],
      [
        "mod+ArrowLeft",
        () => {
          if (cellEditor) navigateEditor("prev");
        },
      ],
    ],
    [cellEditor, items],
  );

  async function handleExport(format: "csv" | "jsonl") {
    if (!datasetId || !projectId) return;

    const params = new URLSearchParams({
      projectId,
      format,
    });

    const response = await fetch(
      buildUrl(`/datasets-v2/${datasetId}/items/export?${params.toString()}`),
      {
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      showErrorNotification("Export failed");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const extension = format === "csv" ? "csv" : "jsonl";
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset?.name ?? "dataset"}-items.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function triggerImport() {
    if (!datasetId || !projectId || !fileContent) return;
    setImporting(true);
    try {
      await fetcher.post(
        `/datasets-v2/${datasetId}/items/import?projectId=${projectId}`,
        {
          arg: {
            format: importFormat,
            payload: fileContent,
          },
        },
      );
      notifications.show({
        title: "Import complete",
        message: "Dataset items imported successfully.",
        color: "teal",
      });
      setImportModalOpen(false);
      setFileContent(null);
      await mutateDataset();
      setSearch("");
      await fetchItems();
    } catch (error) {
      console.error(error);
    } finally {
      setImporting(false);
    }
  }

  function renderCell(item: DraftItem, field: EditableField) {
    const value = item[field];
    const error = item.errors[field];

    return (
      <Stack gap={4}>
        <Textarea
          minRows={1}
          autosize
          value={value}
          onChange={(event) =>
            handleCellEdit(item.id, field, event.currentTarget.value)
          }
          error={error}
        />
        <Group gap="xs">
          <Tooltip label="Expand">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => openCellModal(item.id, field)}
            >
              <IconMaximize size={14} />
            </ActionIcon>
          </Tooltip>
          {error && (
            <Badge color="red" size="sm" variant="light">
              {error}
            </Badge>
          )}
        </Group>
      </Stack>
    );
  }

  const editorItem = getEditorItem();

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Title order={2}>{nameDraft || "Dataset"}</Title>
          <TextInput
            label="Name"
            placeholder="Dataset name"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.currentTarget.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim();
              if (!trimmed) {
                setNameDraft(dataset?.name ?? "");
                return;
              }
              if (trimmed !== nameDraft) {
                setNameDraft(trimmed);
              }
              if (trimmed !== (dataset?.name ?? "")) {
                updateDataset({ name: trimmed })
                  .then(() => mutateDataset())
                  .catch(() => setNameDraft(dataset?.name ?? ""));
              }
            }}
          />
          <TextInput
            label="Description"
            placeholder="Describe this dataset"
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.currentTarget.value)}
            onBlur={() => {
              const nextValue = descriptionDraft.trim();
              if (nextValue !== descriptionDraft) {
                setDescriptionDraft(nextValue);
              }
              const normalized = nextValue.length ? nextValue : null;
              const current = dataset?.description ?? null;
              if (normalized !== current) {
                updateDataset({
                  description: normalized,
                })
                  .then(() => mutateDataset())
                  .catch(() => setDescriptionDraft(dataset?.description ?? ""));
              }
            }}
          />
          <Group gap="xs">
            <Badge>{items.length} row{items.length === 1 ? "" : "s"}</Badge>
            {hasPendingChanges && (
              <Badge color="yellow" leftSection={<IconAlertTriangle size={12} />}>
                Unsaved changes
              </Badge>
            )}
          </Group>
        </Stack>

        <Stack gap="xs">
          <Group justify="flex-end">
            <Menu shadow="md" position="bottom-end">
              <Menu.Target>
                <Button
                  variant="default"
                  leftSection={<IconUpload size={14} />}
                  disabled={
                    items.length > 0 || hasPendingChanges || (dataset?.itemCount ?? 0) > 0
                  }
                >
                  Import
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconUpload size={14} />}
                  onClick={() => {
                    setImportFormat("jsonl");
                    setImportModalOpen(true);
                  }}
                >
                  Import JSONL
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconUpload size={14} />}
                  onClick={() => {
                    setImportFormat("csv");
                    setImportModalOpen(true);
                  }}
                >
                  Import CSV
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            <Menu shadow="md" position="bottom-end">
              <Menu.Target>
                <Button variant="default" leftSection={<IconDownload size={14} />}>
                  Export
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => handleExport("jsonl")}>
                  JSONL
                </Menu.Item>
                <Menu.Item onClick={() => handleExport("csv")}>CSV</Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Button color="red" variant="default" onClick={handleDeleteDataset}>
              Delete dataset
            </Button>
          </Group>
          <Group gap="xs" justify="flex-end">
            <Button
              variant="default"
              onClick={handleDiscard}
              disabled={!hasPendingChanges}
            >
              Discard
            </Button>
            <Button onClick={handleSave} disabled={!hasPendingChanges}>
              Save
            </Button>
          </Group>
        </Stack>
      </Group>

      <TextInput
        placeholder="Search items"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      {datasetLoading || loadingItems ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : (
        <Stack gap="sm">
          <ScrollArea h="60vh">
            <Table striped highlightOnHover withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: "45%" }}>Input</Table.Th>
                  <Table.Th style={{ width: "45%" }}>Expected output</Table.Th>
                  <Table.Th style={{ width: "10%" }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{renderCell(item, "input")}</Table.Td>
                    <Table.Td>{renderCell(item, "expectedOutput")}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <Tooltip label="Duplicate row">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => duplicateItem(item.id)}
                          >
                            <IconCopy size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete row">
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => deleteItem(item.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={addRow}
          >
            Add row
          </Button>
        </Stack>
      )}

      <Modal
        opened={!!cellEditor && !!editorItem}
        onClose={resetEditor}
        title={
          <Group gap="xs">
            <IconArrowsVertical size={16} />
            <Text fw={500}>Edit {cellEditor?.field}</Text>
          </Group>
        }
        size="lg"
        centered
      >
        {editorItem && cellEditor && (
          <Stack>
            <Textarea
              minRows={10}
              autosize
              value={editorItem[cellEditor.field]}
              error={editorItem.errors[cellEditor.field]}
              onChange={(event) =>
                handleCellEdit(
                  editorItem.id,
                  cellEditor.field,
                  event.currentTarget.value,
                )
              }
            />
            <Group justify="space-between">
              <Group gap="xs">
                <Tooltip label="Previous (↑ / ⌘←)">
                  <ActionIcon
                    variant="default"
                    onClick={() => navigateEditor("prev")}
                  >
                    <IconArrowUp size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Next (↓ / ⌘→)">
                  <ActionIcon
                    variant="default"
                    onClick={() => navigateEditor("next")}
                  >
                    <IconArrowDown size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Button onClick={resetEditor}>Close</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setFileContent(null);
        }}
        title="Import dataset items"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Upload a {importFormat.toUpperCase()} file to populate this dataset.
            Import is only available before creating rows.
          </Text>

          <Button
            component="label"
            variant="default"
            leftSection={<IconUpload size={14} />}
          >
            Select file
            <input
              type="file"
              accept={
                importFormat === "jsonl"
                  ? ".jsonl,application/jsonl,text/plain"
                  : ".csv,text/csv"
              }
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setFileContent(text);
              }}
            />
          </Button>

          <Button
            onClick={triggerImport}
            disabled={!fileContent}
            loading={importing}
          >
            Import {importFormat.toUpperCase()}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
