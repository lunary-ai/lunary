import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  Loader,
  Menu,
  Modal,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCopy,
  IconChevronDown,
  IconDeviceFloppy,
  IconDotsVertical,
  IconDownload,
  IconHistory,
  IconPlus,
  IconArrowBackUp,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import {
  DatasetImportPayload,
  DatasetV2Item,
  DatasetV2Version,
  DatasetV2VersionItem,
  useDatasetV2,
  useDatasetV2Version,
  useDatasetV2VersionMutations,
  useDatasetV2Versions,
  useDatasetsV2,
} from "@/utils/dataHooks/dataset";
import { formatDateTime } from "@/utils/format";

const DEFAULT_PREVIEW_MODEL = "gpt-5-mini";

type EditableItem = {
  localId: string;
  id?: string;
  input: string;
  groundTruth: string | null;
  createdAt?: string;
  updatedAt?: string;
  isNew?: boolean;
  isDirty?: boolean;
};

type EditingCell = {
  index: number;
  field: "input" | "groundTruth";
} | null;

type SpreadsheetPasteResult = {
  appliedCount: number;
  lastUpdatedId: string | null;
  lastUpdatedField: "input" | "groundTruth" | null;
  addedRows: number;
};

const FIELD_LABEL: Record<"input" | "groundTruth", string> = {
  input: "Input",
  groundTruth: "Ground truth",
};

function useEditableItems(items: DatasetV2Item[] | undefined) {
  const [localItems, setLocalItems] = useState<EditableItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!items) return;
    const baseItems = items.map((item) => ({
      localId: item.id,
      id: item.id,
      datasetId: item.datasetId,
      input: item.input,
      groundTruth: item.groundTruth,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      isNew: false,
      isDirty: false,
    }));

    setLocalItems(baseItems);
    setDeletedIds(new Set());
  }, [items]);

  const markDirty = useCallback((localId: string) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, isDirty: true } : item,
      ),
    );
  }, []);

  const updateItemValue = useCallback(
    (localId: string, field: "input" | "groundTruth", value: string) => {
      setLocalItems((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? {
                ...item,
                [field]:
                  field === "groundTruth"
                    ? value.length
                      ? value
                      : null
                    : value,
                isDirty: true,
              }
            : item,
        ),
      );
    },
    [],
  );

  const addDuplicate = useCallback((source: EditableItem) => {
    const newItem: EditableItem = {
      localId: `temp-${crypto.randomUUID()}`,
      input: source.input,
      groundTruth: source.groundTruth,
      isNew: true,
      isDirty: true,
    };
    setLocalItems((prev) => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((item: EditableItem) => {
    setLocalItems((prev) =>
      prev.filter((existing) => existing.localId !== item.localId),
    );
    if (item.id) {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id as string);
        return next;
      });
    }
  }, []);

  const resetDirtyState = useCallback(
    (items: DatasetV2Item[]) => {
      const baseItems = items.map((item) => ({
        localId: item.id,
        id: item.id,
        datasetId: item.datasetId,
        input: item.input,
        groundTruth: item.groundTruth,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isNew: false,
        isDirty: false,
      }));
      setLocalItems(baseItems);
      setDeletedIds(new Set());
    },
    [setLocalItems],
  );

  return {
    localItems,
    setLocalItems,
    markDirty,
    updateItemValue,
    addDuplicate,
    removeItem,
    deletedIds,
    resetDirtyState,
  };
}

function CellEditorModal({
  opened,
  onClose,
  field,
  value,
  rowIndex,
  rowCount,
  onChange,
  onNavigate,
  onDuplicate,
  filteredIndex,
  onPasteTable,
}: {
  opened: boolean;
  onClose: () => void;
  field: "input" | "groundTruth";
  value: string;
  rowIndex: number;
  rowCount: number;
  onChange: (value: string) => void;
  onNavigate: (direction: "left" | "right" | "up" | "down") => void;
  onDuplicate: () => void;
  filteredIndex: number;
  onPasteTable: (payload: {
    rows: string[][];
    startField: "input" | "groundTruth";
    startIndex: number;
  }) => SpreadsheetPasteResult | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (opened) {
      const frame = requestAnimationFrame(() => {
        const element = textareaRef.current;
        if (element) {
          element.focus({ preventScroll: true });
          element.setSelectionRange(element.value.length, element.value.length);
        }
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          onNavigate("left");
          break;
        case "ArrowRight":
          event.preventDefault();
          onNavigate("right");
          break;
        case "ArrowUp":
          event.preventDefault();
          onNavigate("up");
          break;
        case "ArrowDown":
          event.preventDefault();
          onNavigate("down");
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [opened, onNavigate]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={FIELD_LABEL[field]}
      size="lg"
      transitionProps={{
        transition: "fade",
        duration: 80,
        timingFunction: "ease-out",
      }}
      overlayProps={{ transitionDuration: 80 }}
      keepMounted
    >
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            Row {rowIndex + 1} / {rowCount}
          </Text>
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              onClick={onDuplicate}
              aria-label="Duplicate row"
            >
              <IconPlus size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={() => onNavigate("left")}
              aria-label="Previous field"
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={() => onNavigate("right")}
              aria-label="Next field"
            >
              <IconChevronRight size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={() => onNavigate("up")}
              aria-label="Previous row"
            >
              <IconChevronUp size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={() => onNavigate("down")}
              aria-label="Next row"
            >
              <IconChevronDown size={16} />
            </ActionIcon>
          </Group>
        </Group>
        <Textarea
          ref={textareaRef}
          autoFocus
          minRows={10}
          autosize
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onPaste={(event) => {
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return;

            const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            const rawRows = normalized.split("\n");
            const parsedRows = rawRows
              .map((row) => row.split("\t"))
              .filter((cols, index) => {
                if (rawRows.length <= 1) return true;
                if (index !== rawRows.length - 1) return true;
                return cols.some((cell) => cell.trim().length > 0);
              });

            const isTableLike =
              parsedRows.length > 1 ||
              parsedRows.some((cols) => cols.length > 1);

            if (!isTableLike) return;

            event.preventDefault();
            const result = onPasteTable({
              rows: parsedRows,
              startField: field,
              startIndex: filteredIndex,
            });

            if (!result && parsedRows[0]) {
              onChange(parsedRows[0][0] ?? "");
            } else if (result) {
              onClose();
            }
          }}
        />
      </Stack>
    </Modal>
  );
}

function UpdateDatasetModal({
  opened,
  onClose,
  initialName,
  initialDescription,
  onSubmit,
  loading,
}: {
  opened: boolean;
  onClose: () => void;
  initialName: string;
  initialDescription: string | null;
  onSubmit: (payload: {
    name: string;
    description: string | null;
  }) => Promise<void>;
  loading: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");

  useEffect(() => {
    if (opened) {
      setName(initialName);
      setDescription(initialDescription ?? "");
    }
  }, [opened, initialName, initialDescription]);

  const handleSubmit = async () => {
    await onSubmit({
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Update dataset" centered>
      <Stack gap="sm">
        <TextInput
          label="Name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          required
        />
        <Textarea
          label="Description"
          minRows={3}
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!name.trim()}
          >
            Save changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function DatasetV2DetailPage() {
  const router = useRouter();
  const datasetId =
    typeof router.query.id === "string" ? router.query.id : undefined;

  const {
    dataset,
    isLoading,
    isValidating,
    mutate,
    updateDataset,
    isUpdating,
    createItem,
    updateItem,
    deleteItem,
    importItems,
    generateOutput,
  } = useDatasetV2(datasetId);

  const [selectedVersionId, setSelectedVersionId] = useState<"latest" | string>(
    "latest",
  );

  const {
    versions,
    isLoading: isLoadingVersions,
    mutate: mutateVersions,
  } = useDatasetV2Versions(datasetId);

  const selectedVersionQueryId =
    selectedVersionId === "latest" ? undefined : selectedVersionId;

  const {
    version: selectedVersion,
    items: selectedVersionItems,
    isLoading: isLoadingVersionItems,
  } = useDatasetV2Version(datasetId, selectedVersionQueryId);

  const { createVersion, restoreVersion, isRestoring } =
    useDatasetV2VersionMutations(datasetId);

  const { mutate: mutateDatasets } = useDatasetsV2();

  const {
    localItems,
    updateItemValue,
    addDuplicate,
    removeItem,
    deletedIds,
    resetDirtyState,
    setLocalItems,
  } = useEditableItems(dataset?.items);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [
    updateModalOpened,
    { open: openUpdateModal, close: closeUpdateModal },
  ] = useDisclosure(false);
  const [leaveModalOpened, { open: openLeaveModal, close: closeLeaveModal }] =
    useDisclosure(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );
  const [generatedOutputs, setGeneratedOutputs] = useState<
    Record<string, string>
  >({});
  const [generatingItemIds, setGeneratingItemIds] = useState<Set<string>>(
    new Set(),
  );
  const isGeneratingPreview = generatingItemIds.size > 0;
  const versionDisplayItems = useMemo<EditableItem[]>(() => {
    if (!selectedVersionItems) {
      return [];
    }

    return selectedVersionItems.map((item) => ({
      localId: item.id,
      id: item.sourceItemId ?? undefined,
      datasetId: item.datasetId,
      input: item.input,
      groundTruth: item.groundTruth,
      createdAt: item.sourceCreatedAt ?? undefined,
      updatedAt: item.sourceUpdatedAt ?? undefined,
      isNew: false,
      isDirty: false,
    }));
  }, [selectedVersionItems]);

  const isViewingLatest = selectedVersionId === "latest";

  const displayItems = useMemo(
    () => (isViewingLatest ? localItems : versionDisplayItems),
    [isViewingLatest, localItems, versionDisplayItems],
  );

  const hasPersistedItems = useMemo(
    () =>
      displayItems.some(
        (item) => item.id && !item.isNew && Boolean(item.input?.trim()),
      ),
    [displayItems],
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const theme = useMantineTheme();
  const isDark = theme.colorScheme === "dark";
  const checkboxStyles = useMemo(
    () => ({
      input: {
        transitionDuration: "80ms",
      },
      icon: {
        transitionDuration: "80ms",
      },
    }),
    [],
  );

  const hasPendingChanges = useMemo(
    () =>
      localItems.some((item) => item.isDirty || item.isNew) ||
      deletedIds.size > 0,
    [localItems, deletedIds],
  );

  const isDirty = isViewingLatest && hasPendingChanges;

  const filteredItems = useMemo(() => {
    let base = displayItems;
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      base = displayItems.filter((item) => {
        const inputMatch = item.input?.toLowerCase().includes(term);
        const expectedMatch =
          item.groundTruth?.toLowerCase().includes(term) ?? false;
        return inputMatch || expectedMatch;
      });
    }

    const addRowPlaceholder: EditableItem = {
      localId: "__add_row__",
      input: "",
      groundTruth: null,
      isNew: false,
      isDirty: false,
    } as EditableItem;

    return isViewingLatest ? [...base, addRowPlaceholder] : base;
  }, [displayItems, debouncedSearch, isViewingLatest]);

  const selectableFilteredItems = useMemo(
    () => filteredItems.filter((item) => item.localId !== "__add_row__"),
    [filteredItems],
  );

  useEffect(() => {
    setLastSelectedIndex(null);
  }, [debouncedSearch]);

  useEffect(() => {
    setSelectedVersionId("latest");
  }, [datasetId]);

  useEffect(() => {
    if (!isViewingLatest) {
      setSelectedIds(new Set());
      setLastSelectedIndex(null);
      return;
    }

    setSelectedIds((prev) => {
      const validIds = new Set(localItems.map((item) => item.localId));
      let shouldUpdate = false;
      prev.forEach((id) => {
        if (!validIds.has(id)) {
          shouldUpdate = true;
        }
      });
      if (!shouldUpdate) {
        return prev;
      }
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [isViewingLatest, localItems]);

  useEffect(() => {
    setGeneratedOutputs((prev) => {
      const next: Record<string, string> = {};
      let changed = false;

      for (const item of localItems) {
        if (!item.id) continue;
        const existing = prev[item.id];
        if (existing !== undefined && !item.isDirty) {
          next[item.id] = existing;
        } else if (existing !== undefined && item.isDirty) {
          changed = true;
        }
      }

      if (Object.keys(next).length !== Object.keys(prev).length) {
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [localItems]);

  const allVisibleSelected =
    selectableFilteredItems.length > 0 &&
    selectableFilteredItems.every((item) => selectedIds.has(item.localId));
  const someVisibleSelected = selectableFilteredItems.some((item) =>
    selectedIds.has(item.localId),
  );

  const toggleSelectAllVisible = useCallback(() => {
    if (!isViewingLatest) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldClear = selectableFilteredItems.every((item) =>
        next.has(item.localId),
      );

      if (shouldClear) {
        selectableFilteredItems.forEach((item) => next.delete(item.localId));
      } else {
        selectableFilteredItems.forEach((item) => next.add(item.localId));
      }

      if (next.size === prev.size) {
        let identical = true;
        for (const id of next) {
          if (!prev.has(id)) {
            identical = false;
            break;
          }
        }
        if (identical) {
          for (const id of prev) {
            if (!next.has(id)) {
              identical = false;
              break;
            }
          }
        }
        if (identical) {
          return prev;
        }
      }

      return next;
    });
    setLastSelectedIndex(null);
  }, [selectableFilteredItems, isViewingLatest]);

  const updateRowSelection = useCallback(
    (localId: string, checked: boolean, shiftKey: boolean) => {
      if (!isViewingLatest) return;
      if (localId === "__add_row__") return;
      const currentIndex = selectableFilteredItems.findIndex(
        (item) => item.localId === localId,
      );
      if (currentIndex === -1) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        const apply = (id: string) => {
          if (checked) {
            next.add(id);
          } else {
            next.delete(id);
          }
        };

        if (shiftKey && selectableFilteredItems.length > 0) {
          const highestIndex = selectableFilteredItems.length - 1;
          const referenceIndex =
            lastSelectedIndex === null
              ? currentIndex
              : Math.min(Math.max(lastSelectedIndex, 0), highestIndex);
          const start = Math.min(referenceIndex, currentIndex);
          const end = Math.max(referenceIndex, currentIndex);
          for (let i = start; i <= end; i++) {
            const target = selectableFilteredItems[i];
            if (target) {
              apply(target.localId);
            }
          }
        } else {
          apply(localId);
        }

        if (next.size === prev.size) {
          let identical = true;
          for (const id of next) {
            if (!prev.has(id)) {
              identical = false;
              break;
            }
          }
          if (identical) {
            for (const id of prev) {
              if (!next.has(id)) {
                identical = false;
                break;
              }
            }
          }
          if (identical) {
            return prev;
          }
        }

        return next;
      });

      setLastSelectedIndex(currentIndex);
    },
    [selectableFilteredItems, lastSelectedIndex, isViewingLatest],
  );

  const selectedCount = selectedIds.size;

  const currentVersionId = dataset?.currentVersionId ?? null;

  const otherVersions = useMemo(
    () => (versions ?? []).filter((version) => version.id !== currentVersionId),
    [versions, currentVersionId],
  );

  const selectedVersionNumber = isViewingLatest
    ? (dataset?.currentVersionNumber ?? null)
    : (selectedVersion?.versionNumber ?? null);

  const latestVersionTimestamp =
    dataset?.currentVersionCreatedAt ?? dataset?.updatedAt ?? null;

  const versionMenuLabel = selectedVersionNumber
    ? `Version v${selectedVersionNumber}`
    : "Versions";

  const versionMenuLoading =
    isLoadingVersions || (!isViewingLatest && isLoadingVersionItems);

  const handleBulkDelete = useCallback(() => {
    if (!isViewingLatest) return;
    if (selectedIds.size === 0) return;
    const itemsToDelete = localItems.filter(
      (item) => item.localId !== "__add_row__" && selectedIds.has(item.localId),
    );

    if (itemsToDelete.length === 0) return;

    const count = itemsToDelete.length;
    modals.openConfirmModal({
      title: `Delete ${count} selected ${count === 1 ? "row" : "rows"}?`,
      confirmProps: { color: "red" },
      labels: { confirm: "Delete", cancel: "Cancel" },
      centered: true,
      children: (
        <Text size="sm">
          This will remove the selected row{count === 1 ? "" : "s"} from this
          dataset. Unsaved deletions will only be applied after you save.
        </Text>
      ),
      onConfirm: () => {
        itemsToDelete.forEach((item) => {
          removeItem(item);
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          itemsToDelete.forEach((item) => next.delete(item.localId));
          return next;
        });
        setLastSelectedIndex(null);
      },
    });
  }, [isViewingLatest, localItems, selectedIds, removeItem]);

  const rowCountExcludingAdd = useMemo(() => {
    return filteredItems.filter((item) => item.localId !== "__add_row__")
      .length;
  }, [filteredItems]);

  const openCellEditor = useCallback(
    (localId: string, field: "input" | "groundTruth") => {
      if (!isViewingLatest) return;
      const index = filteredItems.findIndex((item) => item.localId === localId);
      if (index === -1 || localId === "__add_row__") return;
      setEditingCell({ index, field });
    },
    [filteredItems, isViewingLatest],
  );

  const closeEditor = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleNavigateEditor = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (!isViewingLatest) return;
      if (!editingCell) return;
      const { index, field } = editingCell;
      const total = filteredItems.length;
      let nextIndex = index;
      let nextField = field;

      if (direction === "left") {
        nextField = field === "input" ? "groundTruth" : "input";
        if (nextField === "groundTruth") {
          nextIndex = (index - 1 + total) % total;
        }
      } else if (direction === "right") {
        nextField = field === "input" ? "groundTruth" : "input";
        if (nextField === "input") {
          nextIndex = (index + 1) % total;
        }
      } else if (direction === "up") {
        nextIndex = (index - 1 + total) % total;
      } else if (direction === "down") {
        nextIndex = (index + 1) % total;
      }

      let attempts = 0;
      while (
        filteredItems[nextIndex]?.localId === "__add_row__" &&
        attempts < filteredItems.length
      ) {
        if (
          direction === "down" ||
          (direction === "right" && nextField === "input")
        ) {
          nextIndex = (nextIndex + 1) % total;
        } else {
          nextIndex = (nextIndex - 1 + total) % total;
        }
        attempts += 1;
      }

      setEditingCell({ index: nextIndex, field: nextField });
    },
    [editingCell, filteredItems, isViewingLatest],
  );

  const handleDuplicateRow = useCallback(
    (row: EditableItem) => {
      if (!isViewingLatest) return;
      if (row.localId === "__add_row__") return;
      addDuplicate(row);
    },
    [addDuplicate, isViewingLatest],
  );

  const handleAddRow = useCallback(() => {
    if (!isViewingLatest) return;
    setLocalItems((prev) => [
      ...prev,
      {
        localId: `temp-${crypto.randomUUID()}`,
        input: "",
        groundTruth: null,
        isNew: true,
        isDirty: true,
      },
    ]);
  }, [setLocalItems, isViewingLatest]);

  const navigateWithGuard = useCallback(
    (path: string) => {
      if (isDirty) {
        setPendingNavigation(path);
        openLeaveModal();
      } else {
        router.push(path);
      }
    },
    [isDirty, openLeaveModal, router],
  );

  const handleLeaveWithoutSaving = useCallback(() => {
    if (!pendingNavigation) {
      closeLeaveModal();
      return;
    }
    const target = pendingNavigation;
    setPendingNavigation(null);
    closeLeaveModal();
    router.push(target);
  }, [pendingNavigation, router, closeLeaveModal]);

  const handleGenerateOutputs = useCallback(async () => {
    if (!isViewingLatest) return;
    const persistedItems = localItems.filter(
      (item) =>
        item.localId !== "__add_row__" &&
        item.id &&
        !item.isNew &&
        Boolean(item.input?.trim()),
    ) as Array<EditableItem & { id: string }>;

    if (persistedItems.length === 0) {
      notifications.show({
        title: "Nothing to generate",
        message:
          "Only saved rows with input text are eligible. Save your changes or add input and try again.",
        color: "yellow",
      });
      return;
    }

    const unsavedCount = localItems.filter(
      (item) =>
        item.localId !== "__add_row__" && (!item.id || item.isNew === true),
    ).length;

    const ids = persistedItems.map((item) => item.id);
    setGeneratingItemIds(new Set(ids));

    const successes: string[] = [];
    const failures: string[] = [];

    await Promise.all(
      persistedItems.map(async (item) => {
        try {
          const response = (await generateOutput(item.id, {
            model: DEFAULT_PREVIEW_MODEL,
            input: item.input ?? "",
          })) as { output?: string } | null;

          const normalizedOutput =
            typeof response?.output === "string" ? response.output.trim() : "";

          setGeneratedOutputs((prev) => ({
            ...prev,
            [item.id]: normalizedOutput,
          }));
          successes.push(item.id);
        } catch (error: any) {
          failures.push(
            error?.message ??
              `Unable to generate an output for item ${item.id}`,
          );
        } finally {
          setGeneratingItemIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }
      }),
    );

    setGeneratingItemIds(new Set());

    if (successes.length > 0) {
      notifications.show({
        title: "Outputs generated",
        message: `Generated previews for ${successes.length} item${successes.length === 1 ? "" : "s"}.`,
        color: "green",
      });
    }

    if (unsavedCount > 0) {
      notifications.show({
        title: "Skipped unsaved rows",
        message: `${unsavedCount} row${unsavedCount === 1 ? "" : "s"} skipped because they have unsaved changes.`,
        color: "yellow",
      });
    }

    if (failures.length > 0) {
      notifications.show({
        title: "Some outputs failed",
        message: failures.join("\n"),
        color: "red",
      });
    }
  }, [generateOutput, localItems, isViewingLatest]);

  const handleSave = useCallback(async () => {
    if (!datasetId) return false;
    if (!isDirty) return true;

    setIsSaving(true);
    let success = false;
    try {
      // Create new items
      for (const item of localItems) {
        if (item.isNew) {
          const payload = {
            input: item.input,
            groundTruth: item.groundTruth,
          };
          await createItem(payload);
        }
      }

      // Update existing items
      for (const item of localItems) {
        if (!item.isNew && item.isDirty && item.id) {
          await updateItem(item.id, {
            input: item.input,
            groundTruth: item.groundTruth,
          });
        }
      }

      // Delete removed items
      for (const id of Array.from(deletedIds)) {
        await deleteItem(id);
      }

      const versionResponse = await createVersion();

      const updated = await mutate();
      if (updated?.items) {
        resetDirtyState(updated.items);
      } else if (dataset?.items) {
        resetDirtyState(dataset.items);
      }
      await mutateDatasets();
      await mutateVersions();

      if (versionResponse?.version) {
        notifications.show({
          title: "Dataset saved",
          message: `Saved as version v${versionResponse.version.versionNumber}`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "Dataset saved",
          message: "Changes saved to the latest version.",
          color: "green",
        });
      }

      success = true;
    } catch (error) {
      // fetcher handles error notification
      success = false;
    } finally {
      setIsSaving(false);
    }
    return success;
  }, [
    datasetId,
    isDirty,
    localItems,
    deletedIds,
    createItem,
    updateItem,
    deleteItem,
    mutate,
    resetDirtyState,
    mutateDatasets,
    mutateVersions,
    dataset,
    createVersion,
  ]);

  const handleSaveAndLeave = useCallback(async () => {
    const success = await handleSave();
    if (success && pendingNavigation) {
      const target = pendingNavigation;
      setPendingNavigation(null);
      closeLeaveModal();
      router.push(target);
    }
  }, [handleSave, pendingNavigation, router, closeLeaveModal]);

  const handleCancelLeave = useCallback(() => {
    setPendingNavigation(null);
    closeLeaveModal();
  }, [closeLeaveModal]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasPendingChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasPendingChanges]);

  useEffect(() => {
    router.beforePopState(({ as }) => {
      if (hasPendingChanges) {
        setPendingNavigation(as);
        openLeaveModal();
        return false;
      }
      return true;
    });
    return () => {
      router.beforePopState(() => true);
    };
  }, [hasPendingChanges, openLeaveModal, router]);

  const handleDeleteRow = useCallback(
    (row: EditableItem) => {
      if (!isViewingLatest) return;
      modals.openConfirmModal({
        title: "Delete item?",
        confirmProps: { color: "red" },
        labels: { confirm: "Delete", cancel: "Cancel" },
        children: (
          <Text size="sm">
            This will remove the row from this dataset. Unsaved changes will be
            lost if you cancel.
          </Text>
        ),
        onConfirm: () => {
          removeItem(row);
        },
      });
    },
    [isViewingLatest, removeItem],
  );

  const handleSpreadsheetPaste = useCallback(
    ({
      rows,
      startField,
      startIndex,
    }: {
      rows: string[][];
      startField: "input" | "groundTruth";
      startIndex: number;
    }): SpreadsheetPasteResult | null => {
      if (!isViewingLatest) return null;
      if (!rows.length) return null;

      const sanitizedRows = rows.map((cols) => cols.map((col) => col ?? ""));

      if (
        sanitizedRows.length === 1 &&
        sanitizedRows[0].length === 1 &&
        !sanitizedRows[0][0]
      ) {
        return null;
      }

      const targetDescriptors: Array<
        { type: "existing"; localId: string } | { type: "new" }
      > = [];
      let cursor = startIndex;

      sanitizedRows.forEach(() => {
        let target = filteredItems[cursor];

        while (target && target.localId === "__add_row__") {
          cursor += 1;
          target = filteredItems[cursor];
        }

        if (target) {
          targetDescriptors.push({
            type: "existing",
            localId: target.localId,
          });
          cursor += 1;
        } else {
          targetDescriptors.push({ type: "new" });
        }
      });

      let appliedCount = 0;
      let lastUpdatedId: string | null = null;
      let lastUpdatedField: "input" | "groundTruth" | null = null;
      let createdCount = 0;

      setLocalItems((prev) => {
        const next = [...prev];
        const idToIndex = new Map(
          prev.map((item, index) => [item.localId, index]),
        );

        targetDescriptors.forEach((descriptor, rowIndex) => {
          const columns = sanitizedRows[rowIndex];
          if (!columns) return;

          let targetIndex: number;
          if (descriptor.type === "existing") {
            const existingIndex = idToIndex.get(descriptor.localId);
            if (existingIndex === undefined) return;
            targetIndex = existingIndex;
          } else {
            createdCount += 1;
            const newItem: EditableItem = {
              localId: `temp-${crypto.randomUUID()}`,
              input: "",
              groundTruth: null,
              isNew: true,
              isDirty: true,
            };
            next.push(newItem);
            targetIndex = next.length - 1;
            idToIndex.set(newItem.localId, targetIndex);
          }

          const current = next[targetIndex];
          if (!current) return;

          const updates: Partial<EditableItem> = {};
          if (columns.length > 1) {
            const [inputValue, ...rest] = columns;
            if (inputValue !== undefined) {
              updates.input = inputValue;
              lastUpdatedField = "input";
            }
            const groundTruthValue =
              rest.length > 0 ? rest.join("\t") : undefined;
            if (groundTruthValue !== undefined) {
              updates.groundTruth =
                groundTruthValue.length > 0 ? groundTruthValue : null;
              lastUpdatedField = "groundTruth";
            }
          } else if (startField === "input") {
            const value = columns[0] ?? "";
            updates.input = value;
            lastUpdatedField = "input";
          } else {
            const value = columns[0] ?? "";
            updates.groundTruth = value.length > 0 ? value : null;
            lastUpdatedField = "groundTruth";
          }

          next[targetIndex] = {
            ...current,
            ...updates,
            isDirty: true,
            isNew: current.isNew ?? !current.id,
          };
          lastUpdatedId = current.localId;

          appliedCount += 1;
        });

        return next;
      });

      if (!appliedCount) {
        return null;
      }

      const result: SpreadsheetPasteResult = {
        appliedCount,
        lastUpdatedId,
        lastUpdatedField,
        addedRows: createdCount,
      };

      return result;
    },
    [filteredItems, setLocalItems, isViewingLatest],
  );

  const renderGeneratedOutput = useCallback(
    (item: EditableItem) => {
      if (!item.id) {
        return (
          <Text size="xs" c="dimmed">
            —
          </Text>
        );
      }

      if (generatingItemIds.has(item.id)) {
        return (
          <Text size="xs" c="dimmed">
            Running...
          </Text>
        );
      }

      const preview = generatedOutputs[item.id] ?? "";

      if (!preview) {
        return;
      }

      return (
        <Tooltip label={preview} disabled={preview.length < 60}>
          <Text size="sm" lineClamp={2}>
            {preview}
          </Text>
        </Tooltip>
      );
    },
    [generatedOutputs, generatingItemIds],
  );

  const handleUpdateDataset = useCallback(
    async ({
      name,
      description,
    }: {
      name: string;
      description: string | null;
    }) => {
      if (!datasetId) return;
      await updateDataset(
        {
          name,
          description,
        },
        {
          onSuccess: async () => {
            await mutate();
            await mutateDatasets();
            await mutateVersions();
            closeUpdateModal();
          },
        },
      );
    },
    [
      datasetId,
      updateDataset,
      mutate,
      mutateDatasets,
      mutateVersions,
      closeUpdateModal,
    ],
  );

  const handleSelectVersion = useCallback(
    (nextVersionId: "latest" | string) => {
      if (nextVersionId === selectedVersionId) {
        return;
      }

      if (nextVersionId !== "latest" && hasPendingChanges) {
        notifications.show({
          title: "Save changes first",
          message:
            "Save or discard your unsaved changes before switching versions.",
          color: "yellow",
        });
        return;
      }

      setEditingCell(null);
      setSelectedIds(new Set());
      setLastSelectedIndex(null);
      setSelectedVersionId(nextVersionId);
    },
    [selectedVersionId, hasPendingChanges],
  );

  const handleRestoreVersion = useCallback(async () => {
    if (!datasetId || selectedVersionId === "latest") {
      return;
    }

    try {
      const restored = await restoreVersion(selectedVersionId);
      if (restored) {
        mutate(restored, { revalidate: false });
        resetDirtyState(restored.items ?? []);
        setEditingCell(null);
        setSelectedIds(new Set());
        setLastSelectedIndex(null);
      }

      await mutate();
      await mutateDatasets();
      await mutateVersions();

      setSelectedVersionId("latest");

      if (selectedVersion) {
        notifications.show({
          title: "Version restored",
          message: `Version v${selectedVersion.versionNumber} restored as latest`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "Version restored",
          message: "Version restored as the latest snapshot.",
          color: "green",
        });
      }
    } catch (error) {
      // fetcher handles notification
    }
  }, [
    datasetId,
    selectedVersionId,
    restoreVersion,
    mutate,
    mutateDatasets,
    mutateVersions,
    resetDirtyState,
    selectedVersion,
  ]);

  const handleDownload = useCallback(
    (format: "csv" | "jsonl") => {
      if (!displayItems.length) return;

      if (format === "csv") {
        const rows = [
          `"input","ground_truth"`,
          ...displayItems.map((item) => {
            const input = `"${(item.input ?? "").replace(/"/g, '""')}"`;
            const groundTruth = item.groundTruth
              ? `"${item.groundTruth.replace(/"/g, '""')}"`
              : '""';
            return `${input},${groundTruth}`;
          }),
        ];
        const blob = new Blob([rows.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${dataset?.name ?? "dataset"}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else {
        const lines = displayItems.map((item) =>
          JSON.stringify({
            input: item.input,
            ground_truth: item.groundTruth,
          }),
        );
        const blob = new Blob([`${lines.join("\n")}\n`], {
          type: "application/jsonl;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${dataset?.name ?? "dataset"}.jsonl`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    },
    [displayItems, dataset?.name],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      if (!datasetId || !isViewingLatest) return;

      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "csv" && extension !== "jsonl") {
        console.warn("Unsupported import file type", file.name);
        return;
      }

      setIsImporting(true);
      const content = await file.text();
      const payload: DatasetImportPayload = {
        format: extension,
        content: content.replace(/^\uFEFF/, ""),
      };

      try {
        const result = await importItems(payload);
        if (!result?.insertedCount) {
          console.info("Import completed with no new items", file.name);
        }
        await mutate();
        await mutateDatasets();
        await mutateVersions();
      } catch (error) {
        // handled globally
      } finally {
        setIsImporting(false);
      }
    },
    [
      datasetId,
      importItems,
      dataset?.name,
      mutate,
      mutateDatasets,
      mutateVersions,
      isViewingLatest,
    ],
  );

  const handleUploadClick = () => {
    if (!isViewingLatest) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    event.target.value = "";
  };

  if (!datasetId) {
    return null;
  }

  if (isLoading) {
    return (
      <Container fluid py="lg" px="lg">
        <Loader />
      </Container>
    );
  }

  if (!dataset) {
    return (
      <Container fluid py="lg" px="lg">
        <Stack gap="md">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push("/datasets/v2")}
          >
            Back to datasets
          </Button>
          <Alert color="red" title="Dataset not found">
            This dataset may have been deleted or you might not have access to
            it.
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container fluid py="lg" px="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group align="center" gap="sm">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => navigateWithGuard("/datasets/v2")}
              aria-label="Back to datasets"
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Title order={2}>{dataset.name}</Title>
            <ActionIcon
              variant="subtle"
              aria-label="Edit dataset details"
              onClick={openUpdateModal}
            >
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Group>
          <Group gap="sm">
            <Menu withinPortal>
              <Menu.Target>
                <Button
                  variant="light"
                  leftSection={<IconHistory size={16} />}
                  rightSection={<IconChevronDown size={14} />}
                  loading={versionMenuLoading}
                >
                  {versionMenuLabel}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  onClick={() => handleSelectVersion("latest")}
                  disabled={selectedVersionId === "latest"}
                >
                  <Stack gap={2}>
                    <Text size="sm">
                      Latest (v{dataset?.currentVersionNumber ?? "–"})
                    </Text>
                    <Text size="xs" c="dimmed">
                      {latestVersionTimestamp
                        ? formatDateTime(latestVersionTimestamp)
                        : "Not saved yet"}
                    </Text>
                  </Stack>
                </Menu.Item>
                {otherVersions.length > 0 ? <Menu.Divider /> : null}
                {otherVersions.length > 0 ? (
                  otherVersions.map((version) => (
                    <Menu.Item
                      key={version.id}
                      onClick={() => handleSelectVersion(version.id)}
                      disabled={selectedVersionId === version.id}
                    >
                      <Stack gap={2}>
                        <Group gap={6} justify="space-between">
                          <Text size="sm">
                            Version v{version.versionNumber}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {formatDateTime(version.createdAt)}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {version.itemCount} item
                          {version.itemCount === 1 ? "" : "s"}
                        </Text>
                      </Stack>
                    </Menu.Item>
                  ))
                ) : (
                  <Menu.Label c="dimmed">No previous versions</Menu.Label>
                )}
              </Menu.Dropdown>
            </Menu>
            <Menu withinPortal>
              <Menu.Target>
                <Button
                  variant="subtle"
                  leftSection={<IconDownload size={16} />}
                  rightSection={<IconChevronDown size={14} />}
                >
                  Download
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => handleDownload("csv")}>
                  Download as CSV
                </Menu.Item>
                <Menu.Item onClick={() => handleDownload("jsonl")}>
                  Download as JSONL
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Button
              variant="subtle"
              leftSection={<IconUpload size={16} />}
              onClick={handleUploadClick}
              loading={isImporting}
              disabled={!isViewingLatest}
            >
              Upload
            </Button>
            <Button
              variant="light"
              leftSection={<IconSparkles size={16} />}
              onClick={handleGenerateOutputs}
              loading={isGeneratingPreview}
              disabled={
                !isViewingLatest || !hasPersistedItems || isGeneratingPreview
              }
            >
              Generate output playground
            </Button>
            {isViewingLatest ? (
              <Button
                leftSection={<IconDeviceFloppy size={16} />}
                color="blue"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                loading={isSaving}
              >
                Save
              </Button>
            ) : (
              <Button
                leftSection={<IconArrowBackUp size={16} />}
                color="blue"
                onClick={handleRestoreVersion}
                loading={isRestoring}
                disabled={isRestoring || !selectedVersion}
              >
                Restore version
              </Button>
            )}
          </Group>
        </Group>

        <Group justify="space-between" align="center">
          <Group gap="sm" align="center">
            <TextInput
              placeholder="Search items"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              w="50%"
            />
            {selectedCount > 0 && (
              <Group gap="xs" align="center">
                <Text size="sm" c="dimmed">
                  {selectedCount} selected
                </Text>
                <ActionIcon
                  color="red"
                  variant="filled"
                  aria-label="Delete selected rows"
                  onClick={handleBulkDelete}
                  disabled={!isViewingLatest}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            )}
          </Group>
          {isValidating && (
            <Group gap={6}>
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                Syncing…
              </Text>
            </Group>
          )}
        </Group>

        <Box>
          <Table
            withColumnBorders
            withRowBorders
            highlightOnHover={false}
            verticalSpacing="sm"
            horizontalSpacing="md"
            styles={(theme) => ({
              thead: {
                backgroundColor:
                  theme.colorScheme === "dark"
                    ? theme.colors.dark[6]
                    : theme.colors.gray[1],
              },
              th: {
                textTransform: "lowercase",
                fontWeight: 600,
                backgroundColor:
                  theme.colorScheme === "dark"
                    ? theme.colors.dark[6]
                    : theme.colors.gray[1],
                borderColor:
                  theme.colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[3],
                color:
                  theme.colorScheme === "dark"
                    ? theme.colors.gray[4]
                    : theme.colors.dark[5],
              },
              td: {
                backgroundColor:
                  theme.colorScheme === "dark"
                    ? theme.colors.dark[7]
                    : theme.white,
                borderColor:
                  theme.colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[3],
                fontSize: 14,
                color:
                  theme.colorScheme === "dark"
                    ? theme.colors.gray[2]
                    : theme.colors.dark[6],
              },
              tbody: {
                backgroundColor:
                  theme.colorScheme === "dark"
                    ? theme.colors.dark[7]
                    : theme.white,
              },
            })}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>
                  <Checkbox
                    aria-label="Select all rows"
                    size="sm"
                    radius="sm"
                    styles={checkboxStyles}
                    checked={
                      allVisibleSelected && selectableFilteredItems.length > 0
                    }
                    indeterminate={!allVisibleSelected && someVisibleSelected}
                    disabled={
                      !isViewingLatest || selectableFilteredItems.length === 0
                    }
                    onChange={(event) => {
                      event.stopPropagation();
                      toggleSelectAllVisible();
                    }}
                    onClick={(event) => event.stopPropagation()}
                  />
                </Table.Th>
                <Table.Th w="35%">Input</Table.Th>
                <Table.Th w="30%">Ground Truth</Table.Th>
                <Table.Th w="25%">Output</Table.Th>
                <Table.Th w="10%" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredItems.map((item) =>
                item.localId === "__add_row__" ? (
                  <Table.Tr key="__add_row__">
                    <Table.Td colSpan={5}>
                      <Button
                        variant="subtle"
                        onClick={handleAddRow}
                        fullWidth
                        styles={{
                          root: {
                            justifyContent: "flex-start",
                            color: isDark
                              ? theme.colors.gray[4]
                              : theme.colors.gray[6],
                            backgroundColor: "transparent",
                            fontWeight: 500,
                            "&:hover": {
                              backgroundColor: isDark
                                ? theme.colors.dark[6]
                                : theme.colors.gray[0],
                            },
                          },
                        }}
                      >
                        + Add row
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  <Table.Tr key={item.localId}>
                    <Table.Td
                      w={40}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        aria-label="Select row"
                        size="sm"
                        radius="sm"
                        styles={checkboxStyles}
                        checked={selectedIds.has(item.localId)}
                        disabled={!isViewingLatest}
                        onChange={(event) => {
                          event.stopPropagation();
                          const nativeEvent = event.nativeEvent as
                            | MouseEvent
                            | PointerEvent
                            | KeyboardEvent;
                          const isShift =
                            typeof nativeEvent?.shiftKey === "boolean"
                              ? nativeEvent.shiftKey
                              : false;
                          updateRowSelection(
                            item.localId,
                            event.currentTarget.checked,
                            isShift,
                          );
                        }}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </Table.Td>
                    <Table.Td
                      className="dataset-table-editable"
                      onClick={() => openCellEditor(item.localId, "input")}
                      style={{
                        cursor: isViewingLatest ? "pointer" : "default",
                      }}
                    >
                      <Tooltip
                        label={item.input}
                        disabled={!item.input || item.input.length < 60}
                      >
                        <Text size="sm" lineClamp={2}>
                          {item.input ?? ""}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td
                      className="dataset-table-editable"
                      onClick={() =>
                        openCellEditor(item.localId, "groundTruth")
                      }
                      style={{
                        cursor: isViewingLatest ? "pointer" : "default",
                      }}
                    >
                      <Tooltip
                        label={item.groundTruth ?? ""}
                        disabled={
                          !item.groundTruth || item.groundTruth.length < 60
                        }
                      >
                        <Text size="sm" lineClamp={2}>
                          {item.groundTruth ?? ""}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td style={{ cursor: "default" }}>
                      {renderGeneratedOutput(item)}
                    </Table.Td>
                    <Table.Td style={{ cursor: "default" }}>
                      {isViewingLatest ? (
                        <Group justify="flex-end">
                          <Menu withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconCopy size={14} />}
                                onClick={() => handleDuplicateRow(item)}
                              >
                                Duplicate
                              </Menu.Item>
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={14} />}
                                onClick={() => handleDeleteRow(item)}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      ) : (
                        <Text size="xs" c="dimmed">
                          Read-only
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ),
              )}
            </Table.Tbody>
          </Table>
        </Box>
      </Stack>

      <input
        type="file"
        ref={fileInputRef}
        hidden
        accept=".csv,.jsonl"
        onChange={handleFileInputChange}
      />

      <CellEditorModal
        opened={Boolean(editingCell)}
        onClose={closeEditor}
        field={editingCell?.field ?? "input"}
        value={
          editingCell
            ? (filteredItems[editingCell.index]?.[editingCell.field] ?? "") ||
              ""
            : ""
        }
        rowIndex={
          editingCell
            ? filteredItems
                .slice(0, editingCell.index)
                .filter((item) => item.localId !== "__add_row__").length
            : 0
        }
        rowCount={Math.max(rowCountExcludingAdd, 1)}
        onChange={(newValue) => {
          if (!editingCell) return;
          const item = filteredItems[editingCell.index];
          if (!item) return;
          updateItemValue(item.localId, editingCell.field, newValue);
        }}
        onNavigate={handleNavigateEditor}
        onDuplicate={() => {
          if (!editingCell) return;
          const item = filteredItems[editingCell.index];
          if (!item) return;
          addDuplicate(item);
        }}
        filteredIndex={editingCell?.index ?? 0}
        onPasteTable={handleSpreadsheetPaste}
      />

      <UpdateDatasetModal
        opened={updateModalOpened}
        onClose={closeUpdateModal}
        initialName={dataset.name}
        initialDescription={dataset.description}
        onSubmit={handleUpdateDataset}
        loading={isUpdating}
      />

      <Modal
        opened={leaveModalOpened}
        onClose={closeLeaveModal}
        title="Leave without saving?"
      >
        <Stack gap="sm">
          <Text size="sm">
            You have unsaved changes in your dataset. If you leave now, they
            will be lost.
          </Text>
          <Group justify="space-between" mt="sm">
            <Button
              color="red"
              onClick={handleLeaveWithoutSaving}
              disabled={isSaving}
            >
              Leave
            </Button>
            <Group>
              <Button
                variant="default"
                onClick={handleCancelLeave}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAndLeave}
                loading={isSaving}
                disabled={!isDirty || isSaving}
              >
                Save and Leave
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
      <style jsx global>{`
        .dataset-table-editable {
          transition: background-color 120ms ease !important;
        }
        :root[data-mantine-color-scheme="light"] .dataset-table-editable:hover,
        body[data-mantine-color-scheme="light"] .dataset-table-editable:hover {
          background-color: ${theme.colors.gray[2]} !important;
        }
        :root[data-mantine-color-scheme="dark"] .dataset-table-editable:hover,
        body[data-mantine-color-scheme="dark"] .dataset-table-editable:hover {
          background-color: ${theme.colors.dark[5]} !important;
        }
      `}</style>
    </Container>
  );
}
