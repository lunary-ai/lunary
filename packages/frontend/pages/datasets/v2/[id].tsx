import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/router";
import {
  ActionIcon,
  Alert,
  Box,
  Badge,
  Card,
  Button,
  Checkbox,
  Container,
  Group,
  Loader,
  Menu,
  Modal,
  NumberInput,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  HoverCard,
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
  IconDotsVertical,
  IconDownload,
  IconHistory,
  IconPlus,
  IconArrowBackUp,
  IconSearch,
  IconPlayerPlayFilled,
  IconSettings,
  IconFilter,
  IconFlask,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import {
  DatasetImportPayload,
  DatasetV2,
  DatasetV2Item,
  DatasetV2ItemInput,
  DatasetV2Version,
  DatasetV2VersionItem,
  DatasetV2WithItems,
  DatasetEvaluatorConfig,
  useDatasetV2,
  useDatasetV2Version,
  useDatasetV2VersionMutations,
  useDatasetV2Versions,
  useDatasetsV2,
  useDatasetV2EvaluatorRuns,
  type DatasetEvaluatorRun,
  type DatasetEvaluatorRunSlotSummary,
} from "@/utils/dataHooks/dataset";
import { useEvaluators, type Evaluator } from "@/utils/dataHooks/evaluators";
import { formatDateTime } from "@/utils/format";

const DEFAULT_PREVIEW_MODEL = "gpt-5-mini";
const DATASET_EVALUATOR_SLOTS = [1, 2, 3, 4, 5] as const;

type EditableItem = {
  localId: string;
  id?: string;
  datasetId?: string;
  input: string;
  groundTruth: string | null;
  output: string | null;
  createdAt?: string;
  updatedAt?: string;
  isNew?: boolean;
  isDirty?: boolean;
  evaluatorResults: Record<number, unknown | null>;
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

function extractEvaluatorResults(source: Record<string, any>) {
  const results: Record<number, unknown | null> = {};
  DATASET_EVALUATOR_SLOTS.forEach((slot) => {
    const camelKey = `evaluatorResult${slot}`;
    const snakeKey = `evaluator_result_${slot}`;
    const value = Object.prototype.hasOwnProperty.call(source, camelKey)
      ? (source[camelKey] as unknown | null)
      : Object.prototype.hasOwnProperty.call(source, snakeKey)
        ? (source[snakeKey] as unknown | null)
        : null;
    results[slot] = value;
  });
  return results;
}

type EvaluatorPassInfo = {
  pass: boolean | null;
  value?: string | null;
};

function computeEvaluatorPass(
  result: unknown,
  config?: DatasetEvaluatorConfig,
): EvaluatorPassInfo {
  if (!config || !result || typeof result !== "object") {
    return { pass: null };
  }

  const record = result as Record<string, any>;

  if (config.type === "model-labeler") {
    const candidates: Array<string | undefined> = [];

    if (typeof record.output === "string" && record.output.trim()) {
      candidates.push(record.output.trim());
    }

    if (
      typeof record.primaryLabel === "string" &&
      record.primaryLabel.trim()
    ) {
      candidates.push(record.primaryLabel.trim());
    }

    if (Array.isArray(record.matches)) {
      for (const match of record.matches) {
        if (typeof match === "string" && match.trim()) {
          candidates.push(match.trim());
        } else if (
          typeof match === "object" &&
          typeof match?.label === "string" &&
          match.label.trim()
        ) {
          candidates.push(match.label.trim());
        }
      }
    }

    const label = candidates.find((candidate) => candidate && candidate.length);

    if (!label) {
      return { pass: null };
    }

    const pass = config.passLabels.includes(label);
    return { pass, value: label };
  }

  if (config.type === "model-scorer") {
    let score: number | null = null;

    if (typeof record.score === "number" && Number.isFinite(record.score)) {
      score = record.score;
    } else if (typeof record.output === "string") {
      const parsed = Number(record.output);
      if (Number.isFinite(parsed)) {
        score = parsed;
      }
    }

    if (score === null) {
      return { pass: null };
    }

    return {
      pass: score >= config.threshold,
      value: score.toString(),
    };
  }

  return { pass: null };
}

type DatasetEvaluatorConfigInput = DatasetEvaluatorConfig;

type AddEvaluatorModalProps = {
  opened: boolean;
  onClose: () => void;
  evaluators: Evaluator[];
  isLoading: boolean;
  loading: boolean;
  onConfirm: (evaluatorId: string, config: DatasetEvaluatorConfigInput | null) => void;
};

function AddEvaluatorModal({
  opened,
  onClose,
  evaluators,
  isLoading,
  loading,
  onConfirm,
}: AddEvaluatorModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [labelPassMap, setLabelPassMap] = useState<Record<string, boolean>>({});
  const [scoreThreshold, setScoreThreshold] = useState<string>("");

  useEffect(() => {
    if (!opened) {
      setSelectedId(null);
      setLabelPassMap({});
      setScoreThreshold("");
    }
  }, [opened]);

  const options = useMemo(
    () =>
      evaluators.map((evaluator) => ({
        value: evaluator.id,
        label: evaluator.name,
      })),
    [evaluators],
  );

  const selectedEvaluator = useMemo(
    () => evaluators.find((evaluator) => evaluator.id === selectedId),
    [evaluators, selectedId],
  );

  useEffect(() => {
    if (!selectedEvaluator) {
      setLabelPassMap({});
      setScoreThreshold("");
      return;
    }

    if (selectedEvaluator.type === "model-labeler") {
      const labels = Array.isArray(selectedEvaluator.params?.labels)
        ? (selectedEvaluator.params.labels as string[])
        : [];
      const next: Record<string, boolean> = {};
      labels.forEach((label) => {
        next[label] = false;
      });
      setLabelPassMap(next);
      setScoreThreshold("");
    } else if (selectedEvaluator.type === "model-scorer") {
      setLabelPassMap({});
      if (typeof selectedEvaluator.params?.threshold === "number") {
        setScoreThreshold(String(selectedEvaluator.params.threshold));
      } else {
        setScoreThreshold("");
      }
    } else {
      setLabelPassMap({});
      setScoreThreshold("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvaluator]);

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleSubmit = () => {
    if (!selectedId) return;
    const evaluator = selectedEvaluator;
    let config: DatasetEvaluatorConfigInput | null = null;

    if (evaluator?.type === "model-labeler") {
      const labels = Object.keys(labelPassMap);
      if (labels.length === 0) {
        notifications.show({
          title: "No labels available",
          message:
            "This evaluator has no labels configured. Update the evaluator before attaching it.",
          color: "yellow",
        });
        return;
      }

      const passLabels = labels.filter((label) => labelPassMap[label]);

      if (passLabels.length === 0) {
        notifications.show({
          title: "Select passing labels",
          message: "Choose at least one label that should count as a pass.",
          color: "yellow",
        });
        return;
      }

      config = {
        type: "model-labeler",
        passLabels,
      };
    } else if (evaluator?.type === "model-scorer") {
      const thresholdValue = Number(scoreThreshold);
      if (!Number.isFinite(thresholdValue)) {
        notifications.show({
          title: "Add a threshold",
          message: "Enter a numeric pass threshold for this evaluator.",
          color: "yellow",
        });
        return;
      }

      config = {
        type: "model-scorer",
        threshold: thresholdValue,
      };
    }

    onConfirm(selectedId, config);
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Add evaluator" centered>
      <Stack gap="sm">
        {isLoading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : options.length === 0 ? (
          <Alert color="blue" title="No custom evaluators">
            Create a custom evaluator in the Evaluators section to make it
            available here.
          </Alert>
        ) : (
          <Select
            label="Evaluator"
            placeholder="Select an evaluator"
            data={options}
            value={selectedId}
            onChange={setSelectedId}
            searchable
            nothingFound="No evaluators"
            disabled={loading}
          />
        )}

        {selectedEvaluator?.type === "model-labeler" && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Mark which labels count as a pass
            </Text>
            {Array.isArray(selectedEvaluator.params?.labels) &&
            selectedEvaluator.params.labels.length > 0 ? (
              <Stack gap={6}>
                {(selectedEvaluator.params.labels as string[]).map((label) => (
                  <Group key={label} justify="space-between">
                    <Text size="sm">{label}</Text>
                    <Group gap="xs">
                      <Badge
                        variant={labelPassMap[label] ? "filled" : "light"}
                        color={labelPassMap[label] ? "green" : "gray"}
                      >
                        {labelPassMap[label] ? "Pass" : "Fail"}
                      </Badge>
                      <Switch
                        size="sm"
                        onLabel="Pass"
                        offLabel="Fail"
                        checked={Boolean(labelPassMap[label])}
                        onChange={(event) =>
                          setLabelPassMap((prev) => ({
                            ...prev,
                            [label]: event.currentTarget?.checked ?? false,
                          }))
                        }
                      />
                    </Group>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text size="xs" c="dimmed">
                This evaluator has no labels configured. Update the evaluator to
                add labels first.
              </Text>
            )}
          </Stack>
        )}

        {selectedEvaluator?.type === "model-scorer" && (
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Set the minimum passing score
            </Text>
            <NumberInput
              placeholder="Enter pass threshold"
              value={scoreThreshold}
              onChange={(value) =>
                setScoreThreshold(value === null ? "" : String(value))
              }
              allowNegative={false}
              disabled={loading}
            />
          </Stack>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              isLoading ||
              options.length === 0 ||
              !selectedId ||
              (selectedEvaluator?.type === "model-labeler" &&
                Object.keys(labelPassMap).length === 0)
            }
            loading={loading}
          >
            Add
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

type EvaluatorResultSummary = {
  display: string;
  tooltip?: ReactNode | null;
  tone?: "default" | "muted" | "success" | "danger";
};

function summarizeEvaluatorResult(value: unknown): EvaluatorResultSummary {
  if (value === null || value === undefined) {
    return { display: "—", tone: "muted" };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { display: "—", tone: "muted" };
    }
    const truncated = trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
    return {
      display: truncated,
      tooltip: trimmed.length > 60 ? trimmed : null,
    };
  }

  if (typeof value === "number") {
    return {
      display: Number.isInteger(value) ? value.toString() : value.toFixed(2),
    };
  }

  if (typeof value === "boolean") {
    return { display: value ? "True" : "False" };
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((entry) =>
        typeof entry === "string" ? entry : JSON.stringify(entry ?? ""),
      )
      .filter(Boolean)
      .join(", ");
    if (!joined) {
      return { display: "—", tone: "muted" };
    }
    const truncated = joined.length > 60 ? `${joined.slice(0, 57)}…` : joined;
    return {
      display: truncated,
      tooltip: joined.length > 60 ? joined : null,
    };
  }

  if (typeof value === "object") {
    const record = value as Record<string, any>;

    const outputText =
      typeof record.output === "string" ? record.output.trim() : "";
    const reasoningText =
      typeof record.reasoning === "string" ? record.reasoning.trim() : "";

    if (outputText || reasoningText) {
      const displaySource = outputText || reasoningText;
      const truncated =
        displaySource.length > 60
          ? `${displaySource.slice(0, 57)}…`
          : displaySource;

      const modelName =
        typeof record.model === "string" && record.model.trim().length
          ? record.model.trim()
          : null;

      const tooltip = (
        <Stack gap={6} maw={360}>
          {outputText && (
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {outputText}
            </Text>
          )}
          {reasoningText && (
            <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
              {reasoningText}
            </Text>
          )}
          {modelName && (
            <Text size="xs" c="dimmed">
              Model: {modelName}
            </Text>
          )}
        </Stack>
      );

      return {
        display: truncated || "—",
        tooltip,
      };
    }

    if (typeof record.score === "number") {
      const numeric = record.score as number;
      const display = Number.isFinite(numeric)
        ? Number.isInteger(numeric)
          ? numeric.toString()
          : numeric.toFixed(2)
        : String(numeric);
      return {
        display,
        tooltip: JSON.stringify(record),
      };
    }

    if (typeof record.primaryLabel === "string" && record.primaryLabel.trim()) {
      const label = record.primaryLabel.trim();
      const truncated = label.length > 60 ? `${label.slice(0, 57)}…` : label;
      return {
        display: truncated,
        tooltip: JSON.stringify(record),
      };
    }

    if (Array.isArray(record.matches) && record.matches.length) {
      const joined = record.matches.map((entry: any) => String(entry)).join(", ");
      const truncated = joined.length > 60 ? `${joined.slice(0, 57)}…` : joined;
      return {
        display: truncated,
        tooltip: JSON.stringify(record),
      };
    }

    if (typeof record.passed === "boolean") {
      return {
        display: record.passed ? "Pass" : "Fail",
        tone: record.passed ? "success" : "danger",
        tooltip: JSON.stringify(record),
      };
    }

    const json = JSON.stringify(record);
    const truncated = json.length > 60 ? `${json.slice(0, 57)}…` : json;
    return {
      display: truncated,
      tooltip: json.length > 60 ? json : null,
    };
  }

  const fallback = String(value);
  if (!fallback.trim()) {
    return { display: "—", tone: "muted" };
  }
  const truncated = fallback.length > 60 ? `${fallback.slice(0, 57)}…` : fallback;
  return {
    display: truncated,
    tooltip: fallback.length > 60 ? fallback : null,
  };
}

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
      output: item.output,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      isNew: false,
      isDirty: false,
      evaluatorResults: extractEvaluatorResults(item as unknown as Record<string, any>),
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
      datasetId: source.datasetId,
      input: source.input,
      groundTruth: source.groundTruth,
      output: source.output,
      isNew: true,
      isDirty: true,
      evaluatorResults: {},
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
        output: item.output,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isNew: false,
        isDirty: false,
        evaluatorResults: extractEvaluatorResults(item as unknown as Record<string, any>),
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
    addEvaluator,
    removeEvaluator,
    runEvaluators,
  } = useDatasetV2(datasetId);

  const [selectedVersionId, setSelectedVersionId] = useState<"latest" | string>(
    "latest",
  );

  const initialTabParam = Array.isArray(router.query.tab)
    ? router.query.tab[0]
    : router.query.tab;
  const [activeTab, setActiveTab] = useState<"data" | "runs">(
    initialTabParam === "runs" ? "runs" : "data",
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

  const { evaluators: customEvaluators, isLoading: isLoadingEvaluators } =
    useEvaluators({ kind: "custom" });

  const {
    runs,
    aggregate: runAggregate,
    isLoading: isLoadingRuns,
    isValidating: isValidatingRuns,
    mutate: mutateRuns,
  } = useDatasetV2EvaluatorRuns(datasetId);

  const [isAttachingEvaluator, setIsAttachingEvaluator] = useState(false);
  const [isRunningEvaluators, setIsRunningEvaluators] = useState(false);

  const [
    addEvaluatorModalOpened,
    { open: openAddEvaluatorModal, close: closeAddEvaluatorModal },
  ] = useDisclosure(false);

  useEffect(() => {
    if (!router.isReady) return;
    const tabValue = Array.isArray(router.query.tab)
      ? router.query.tab[0]
      : router.query.tab;

    if (tabValue === "runs" && activeTab !== "runs") {
      setActiveTab("runs");
    } else if (
      (!tabValue || tabValue === "data") &&
      activeTab !== "data"
    ) {
      setActiveTab("data");
    }
  }, [router.isReady, router.query.tab, activeTab]);

  const handleTabChange = useCallback(
    (value: string | null) => {
      if (value !== "data" && value !== "runs") {
        return;
      }

      setActiveTab(value);

      const nextQuery: Record<string, any> = { ...router.query };
      if (value === "data") {
        delete nextQuery.tab;
      } else {
        nextQuery.tab = value;
      }

      router.replace(
        { pathname: router.pathname, query: nextQuery },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );

  const {
    localItems,
    updateItemValue,
    addDuplicate,
    removeItem,
    deletedIds,
    resetDirtyState,
    setLocalItems,
  } = useEditableItems(dataset?.items);

  const evaluatorSlots = useMemo(
    () => {
      if (!dataset) return [] as Array<{
        slot: number;
        evaluatorId: string;
        name: string;
      }>;

      return DATASET_EVALUATOR_SLOTS.map((slot) => {
        const key = `evaluatorSlot${slot}Id` as keyof DatasetV2WithItems;
        const evaluatorId = dataset[key] as string | null | undefined;
        if (!evaluatorId) {
          return null;
        }
        const evaluator = customEvaluators.find((ev) => ev.id === evaluatorId);
        return {
          slot,
          evaluatorId,
          name: evaluator?.name ?? "Evaluator",
        };
      }).filter(Boolean) as Array<{
        slot: number;
        evaluatorId: string;
        name: string;
      }>;
    },
    [dataset, customEvaluators],
  );

const availableEvaluators = useMemo(
    () =>
      customEvaluators.filter(
        (evaluator) =>
          !evaluatorSlots.some((slot) => slot.evaluatorId === evaluator.id),
      ),
    [customEvaluators, evaluatorSlots],
  );

  const hasEvaluatorCapacity =
    evaluatorSlots.length < DATASET_EVALUATOR_SLOTS.length;

  const displayEvaluatorSlots = useMemo(() => {
    if (evaluatorSlots.length === 0) {
      return evaluatorSlots;
    }

    const slots = [...evaluatorSlots];
    const findIndexByName = (predicate: (name: string) => boolean) =>
      slots.findIndex((entry) => predicate(entry.name?.toLowerCase() ?? ""));

    const topicsIndex = findIndexByName((name) => name.includes("topic"));
    const piiIndex = findIndexByName((name) => name.includes("pii"));

    if (
      topicsIndex !== -1 &&
      piiIndex !== -1 &&
      piiIndex !== topicsIndex + 1
    ) {
      const [piiSlot] = slots.splice(piiIndex, 1);
      slots.splice(Math.min(topicsIndex + 1, slots.length), 0, piiSlot);
    }

    return slots;
  }, [evaluatorSlots]);

  const [evaluatorFilters, setEvaluatorFilters] = useState<
    Record<number, "all" | "pass" | "fail">
  >({});

  const handleSetEvaluatorFilter = useCallback(
    (slot: number, value: "all" | "pass" | "fail") => {
      setEvaluatorFilters((prev) => {
        if (value === "all") {
          const { [slot]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [slot]: value };
      });
    },
    [],
  );

  useEffect(() => {
    setEvaluatorFilters((prev) => {
      const next: Record<number, "all" | "pass" | "fail"> = {};
      displayEvaluatorSlots.forEach(({ slot }) => {
        if (prev[slot] && prev[slot] !== "all") {
          next[slot] = prev[slot];
        }
      });
      return next;
    });
  }, [displayEvaluatorSlots]);

  const runEvaluatorColumns = useMemo(() => {
    const map = new Map<
      number,
      { slot: number; evaluatorId: string | null; evaluatorName: string }
    >();

    runs.forEach((run) => {
      run.slots.forEach((slot) => {
        if (!map.has(slot.slot)) {
          map.set(slot.slot, {
            slot: slot.slot,
            evaluatorId: slot.evaluatorId,
            evaluatorName: slot.evaluatorName ?? `Slot ${slot.slot}`,
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.slot - b.slot);
  }, [runs]);

  const overallRunStats = useMemo(() => {
    const aggregateMap = new Map<
      string,
      {
        slot: number;
        evaluatorId: string | null;
        evaluatorName: string | null;
        evaluatorKind: string | null;
        evaluatorType: string | null;
        pass: number;
        fail: number;
        unknown: number;
        evaluated: number;
        runCount: number;
      }
    >();

    runAggregate.forEach((entry) => {
      const key = entry.evaluatorId ?? `slot-${entry.slot}`;
      aggregateMap.set(key, {
        slot: entry.slot,
        evaluatorId: entry.evaluatorId,
        evaluatorName: entry.evaluatorName,
        evaluatorKind: entry.evaluatorKind ?? null,
        evaluatorType: entry.evaluatorType ?? null,
        pass: entry.passCount ?? 0,
        fail: entry.failCount ?? 0,
        unknown: entry.unknownCount ?? 0,
        evaluated: entry.evaluatedCount ?? 0,
        runCount: entry.runCount ?? 0,
      });
    });

    if (aggregateMap.size === 0 && runs.length > 0) {
      runs.forEach((run) => {
        run.slots.forEach((slot) => {
          const key = slot.evaluatorId ?? `slot-${slot.slot}`;
          if (!aggregateMap.has(key)) {
            aggregateMap.set(key, {
              slot: slot.slot,
              evaluatorId: slot.evaluatorId,
              evaluatorName: slot.evaluatorName,
              evaluatorKind: slot.evaluatorKind,
              evaluatorType: slot.evaluatorType,
              pass: slot.passCount,
              fail: slot.failCount,
              unknown: slot.unknownCount,
              evaluated: slot.evaluatedCount,
              runCount: 1,
            });
          }
        });
      });
    }

    return Array.from(aggregateMap.values())
      .map((entry) => {
        const passRate =
          entry.evaluated > 0
            ? Number(((entry.pass / entry.evaluated) * 100).toFixed(1))
            : null;

        return {
          ...entry,
          passRate,
        };
      })
      .sort((a, b) => a.slot - b.slot);
  }, [runAggregate, runs]);

  const overallRunStatsColumnCount = useMemo(
    () => Math.max(1, Math.min(3, overallRunStats.length || 1)),
    [overallRunStats],
  );

  const formatPercentage = useCallback((value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return "—";
    }

    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 0.1) {
      return `${rounded}%`;
    }

    return `${value.toFixed(1)}%`;
  }, []);

  const dataColumnCount = 3 + displayEvaluatorSlots.length;
  const fixedColumnWidthPx = 108; // checkbox + actions columns (46px + 62px)
  const equalColumnWidth =
    dataColumnCount > 0
      ? `calc((100% - ${fixedColumnWidthPx}px) / ${dataColumnCount})`
      : "auto";

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
  const generatedOutputChanges = useMemo(() => {
    if (!Object.keys(generatedOutputs).length) {
      return {} as Record<string, string | null>;
    }
    const byId = new Map<string, EditableItem>();
    localItems.forEach((item) => {
      if (item.id) {
        byId.set(item.id, item);
      }
    });

    const changes: Record<string, string | null> = {};
    Object.entries(generatedOutputs).forEach(([itemId, output]) => {
      const target = byId.get(itemId);
      if (!target) return;
      const normalized = output.length > 0 ? output : null;
      const current = target.output ?? null;
      if (current !== normalized) {
        changes[itemId] = normalized;
      }
    });

    return changes;
  }, [generatedOutputs, localItems]);

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
      output: item.output,
      createdAt: item.sourceCreatedAt ?? undefined,
      updatedAt: item.sourceUpdatedAt ?? undefined,
      isNew: false,
      isDirty: false,
      evaluatorResults: extractEvaluatorResults(item as unknown as Record<string, any>),
    }));
  }, [selectedVersionItems]);

  const isViewingLatest = selectedVersionId === "latest";

  const displayItems = useMemo(
    () => (isViewingLatest ? localItems : versionDisplayItems),
    [isViewingLatest, localItems, versionDisplayItems],
  );

  const evaluatorStats = useMemo(() => {
    const stats: Record<number, { pass: number; fail: number }> = {};
    displayEvaluatorSlots.forEach(({ slot }) => {
      stats[slot] = { pass: 0, fail: 0 };
    });

    for (const item of displayItems) {
      if (item.localId === "__add_row__") continue;
      for (const { slot } of displayEvaluatorSlots) {
        const passInfo = computeEvaluatorPass(
          item.evaluatorResults?.[slot],
          dataset?.evaluatorConfigs?.[slot],
        );
        if (passInfo.pass === true) {
          stats[slot].pass += 1;
        } else if (passInfo.pass === false) {
          stats[slot].fail += 1;
        }
      }
    }

    return stats;
  }, [displayEvaluatorSlots, displayItems, dataset?.evaluatorConfigs]);

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
  const getSuccessColor = useCallback(
    (percentage: number | null) => {
      if (percentage === null) {
        return isDark ? theme.colors.gray[5] : theme.colors.gray[6];
      }
      const hue = Math.max(
        0,
        Math.min(120, Math.round((percentage / 100) * 120)),
      );
      const saturation = 70;
      const lightness = isDark ? 60 : 45;
      return `hsl(${hue}deg ${saturation}% ${lightness}%)`;
    },
    [isDark, theme.colors.gray],
  );

  const neutralMetricColor = useMemo(
    () => (isDark ? theme.colors.gray[5] : theme.colors.gray[6]),
    [isDark, theme.colors.gray],
  );

  const renderEvaluatorSuccess = useCallback(
    (slot: number) => {
      const stats = evaluatorStats[slot];
      if (!stats) return null;
      const total = stats.pass + stats.fail;
      const percentage = total > 0 ? Math.round((stats.pass / total) * 100) : null;
      const color = getSuccessColor(percentage);
      const displayValue = percentage === null ? "—" : `${percentage}%`;

      return (
        <HoverCard withArrow withinPortal>
          <HoverCard.Target>
            <Text
              size="xs"
              fw={600}
              style={{ color, cursor: "default" }}
              component="span"
            >
              {displayValue}
            </Text>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Stack gap={4}>
              <Text size="sm">{stats.pass} passed</Text>
              <Text size="sm">{stats.fail} failed</Text>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
      );
    },
    [evaluatorStats, getSuccessColor],
  );

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
      deletedIds.size > 0 ||
      Object.keys(generatedOutputChanges).length > 0,
    [localItems, deletedIds, generatedOutputChanges],
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
        const outputMatch =
          item.output?.toLowerCase().includes(term) ?? false;
        return inputMatch || expectedMatch || outputMatch;
      });
    }

    const activeFilters = Object.entries(evaluatorFilters).filter(
      ([, value]) => value !== "all",
    );

    if (activeFilters.length) {
      base = base.filter((item) => {
        if (item.localId === "__add_row__") {
          return true;
        }
        return activeFilters.every(([slotKey, filterValue]) => {
          const slot = Number(slotKey);
          const config = dataset?.evaluatorConfigs?.[slot];
          const passInfo = computeEvaluatorPass(
            item.evaluatorResults?.[slot],
            config,
          );

          if (filterValue === "pass") {
            return passInfo.pass === true;
          }

          if (filterValue === "fail") {
            return passInfo.pass === false;
          }

          return true;
        });
      });
    }

    const addRowPlaceholder: EditableItem = {
      localId: "__add_row__",
      input: "",
      groundTruth: null,
      output: null,
      isNew: false,
      isDirty: false,
      evaluatorResults: {},
    } as EditableItem;

    return isViewingLatest ? [...base, addRowPlaceholder] : base;
  }, [
    displayItems,
    debouncedSearch,
    evaluatorFilters,
    dataset?.evaluatorConfigs,
    isViewingLatest,
  ]);

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
        output: null,
        isNew: true,
        isDirty: true,
        evaluatorResults: {},
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

  const handleRunEvaluators = useCallback(async () => {
    if (isRunningEvaluators) {
      return;
    }

    if (!isViewingLatest) {
      notifications.show({
        title: "Switch to latest version",
        message: "You can only run evaluators on the latest dataset version.",
        color: "yellow",
      });
      return;
    }

    if (!evaluatorSlots.length) {
      notifications.show({
        title: "Add an evaluator",
        message: "Attach at least one custom evaluator before running tests.",
        color: "yellow",
      });
      return;
    }

    if (hasPendingChanges) {
      notifications.show({
        title: "Save changes first",
        message: "Save or discard your unsaved edits before running evaluators.",
        color: "yellow",
      });
      return;
    }

    if (!hasPersistedItems) {
      notifications.show({
        title: "No saved rows",
        message: "Save at least one row with input text to run evaluators.",
        color: "yellow",
      });
      return;
    }

    setIsRunningEvaluators(true);
    try {
      const response = await runEvaluators();
      if (!response) {
        return;
      }

      if (response.dataset?.items) {
        resetDirtyState(response.dataset.items);
      } else if (dataset?.items) {
        resetDirtyState(dataset.items);
      }

      await mutateDatasets();
      await mutateVersions();
      await mutateRuns();

      const updatedCount = response.updatedItemCount ?? 0;
      const versionNumber =
        typeof response.version?.versionNumber === "number"
          ? response.version.versionNumber
          : null;
      const baseMessage =
        updatedCount > 0
          ? `Updated ${updatedCount} row${updatedCount === 1 ? "" : "s"}.`
          : "No rows required updates.";
      const message =
        versionNumber !== null
          ? `${baseMessage} Saved as version v${versionNumber}.`
          : baseMessage;

      notifications.show({
        title: "Evaluators finished",
        message,
        color: updatedCount > 0 ? "green" : "blue",
      });
    } catch (error) {
      // fetcher handles error notifications
    } finally {
      setIsRunningEvaluators(false);
    }
  }, [
    isRunningEvaluators,
    isViewingLatest,
    evaluatorSlots,
    hasPendingChanges,
    hasPersistedItems,
    runEvaluators,
    resetDirtyState,
    dataset?.items,
    mutateDatasets,
    mutateVersions,
    mutateRuns,
  ]);

  const handleConfirmAddEvaluator = useCallback(
    async (
      evaluatorId: string,
      config: DatasetEvaluatorConfigInput | null,
    ) => {
      if (!evaluatorId) return;

      if (evaluatorSlots.some((slot) => slot.evaluatorId === evaluatorId)) {
        notifications.show({
          title: "Evaluator already added",
          message: "This evaluator is already attached to the dataset.",
          color: "blue",
        });
        return;
      }

      if (!hasEvaluatorCapacity) {
        notifications.show({
          title: "Maximum reached",
          message: "You can attach up to five evaluators per dataset.",
          color: "yellow",
        });
        return;
      }

      setIsAttachingEvaluator(true);
      try {
        await addEvaluator(evaluatorId, config ?? undefined);
        await mutateDatasets();

        notifications.show({
          title: "Evaluator added",
          message: "A new evaluator column was added to the dataset.",
          color: "green",
        });

        closeAddEvaluatorModal();
      } catch (error) {
        // fetcher handles error notifications
      } finally {
        setIsAttachingEvaluator(false);
      }
    },
    [
      addEvaluator,
      mutateDatasets,
      evaluatorSlots,
      hasEvaluatorCapacity,
      closeAddEvaluatorModal,
    ],
  );

  const handleRemoveEvaluator = useCallback(
    async (slot: number) => {
      if (!isViewingLatest) return;

      const previousItems = localItems;

      setLocalItems(
        previousItems.map((item) => {
          const nextResults = { ...item.evaluatorResults };
          delete nextResults[slot];
          return {
            ...item,
            evaluatorResults: nextResults,
          };
        }),
      );

      try {
        await removeEvaluator(slot);
        await mutateDatasets();

        notifications.show({
          title: "Evaluator removed",
          message: "The evaluator column has been removed from the dataset.",
          color: "green",
        });
      } catch (error) {
        // error notifications handled by fetcher
        setLocalItems(previousItems.map((item) => ({ ...item })));
        await mutate();
      }
    },
    [
      isViewingLatest,
      localItems,
      removeEvaluator,
      mutate,
      mutateDatasets,
      setLocalItems,
    ],
  );

  const handleSave = useCallback(async () => {
    if (!datasetId) return false;
    if (!isDirty) return true;

    setIsSaving(true);
    const pendingGeneratedChanges = { ...generatedOutputChanges };
    let success = false;
    try {
      // Create new items
      for (const item of localItems) {
        if (item.isNew) {
          const payload = {
            input: item.input,
            groundTruth: item.groundTruth,
            output: item.output,
          };
          await createItem(payload);
        }
      }

      // Update existing items
      for (const item of localItems) {
        if (!item.id || item.isNew) {
          continue;
        }
        const hasGeneratedChange = Object.prototype.hasOwnProperty.call(
          pendingGeneratedChanges,
          item.id,
        );
        if (!item.isDirty && !hasGeneratedChange) {
          continue;
        }

        const payload: DatasetV2ItemInput = {};
        if (item.isDirty) {
          payload.input = item.input;
          payload.groundTruth = item.groundTruth;
        }
        if (hasGeneratedChange) {
          payload.output = pendingGeneratedChanges[item.id] ?? null;
          delete pendingGeneratedChanges[item.id];
        }

        if (
          Object.prototype.hasOwnProperty.call(payload, "input") ||
          Object.prototype.hasOwnProperty.call(payload, "groundTruth") ||
          Object.prototype.hasOwnProperty.call(payload, "output")
        ) {
          await updateItem(item.id, {
            ...payload,
          });
        }
      }

      // Apply remaining generated output updates (for items without other edits)
      for (const [itemId, output] of Object.entries(pendingGeneratedChanges)) {
        await updateItem(itemId, {
          output: output ?? null,
        });
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
      setGeneratedOutputs({});
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
    generatedOutputChanges,
    setGeneratedOutputs,
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
              output: null,
              isNew: true,
              isDirty: true,
              evaluatorResults: {},
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
      if (item.id && generatingItemIds.has(item.id)) {
        return (
          <Text size="xs" c="dimmed">
            Running...
          </Text>
        );
      }

      const preview = item.id ? generatedOutputs[item.id] : undefined;
      const saved = item.output ?? "";
      const display = preview ?? saved;
      const isPending = preview !== undefined && preview !== saved;

      if (!display) {
        return (
          <Text size="xs" c="dimmed">
            —
          </Text>
        );
      }

      return (
        <Tooltip label={display} disabled={display.length < 60}>
          <Text
            size="sm"
            lineClamp={2}
            style={{ fontStyle: isPending ? "italic" : undefined }}
            c={isPending ? "teal" : undefined}
          >
            {display}
          </Text>
        </Tooltip>
      );
    },
    [generatedOutputs, generatingItemIds],
  );

  const renderEvaluatorResult = useCallback(
    (item: EditableItem, slot: number) => {
      const config = dataset?.evaluatorConfigs?.[slot];
      const summary = summarizeEvaluatorResult(item.evaluatorResults?.[slot]);
      const passInfo = computeEvaluatorPass(item.evaluatorResults?.[slot], config);

      if (passInfo.pass !== null) {
        const badge = (
          <Badge
            color={passInfo.pass ? "green" : "red"}
            variant="light"
            radius="sm"
            size="sm"
          >
            {passInfo.pass ? "Pass" : "Fail"}
          </Badge>
        );

        const tooltipContent = summary.tooltip ? (
          summary.tooltip
        ) : passInfo.value ? (
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {passInfo.value}
          </Text>
        ) : null;

        return tooltipContent ? (
          <Tooltip label={tooltipContent} maw={360} multiline>
            {badge}
          </Tooltip>
        ) : (
          badge
        );
      }

      const color =
        summary.tone === "muted"
          ? "dimmed"
          : summary.tone === "success"
            ? "teal"
            : summary.tone === "danger"
              ? "red"
              : undefined;

      const content = (
        <Text size="sm" c={color} lineClamp={1} style={{ maxWidth: 200 }}>
          {summary.display}
        </Text>
      );

      if (summary.tooltip) {
        return (
          <Tooltip label={summary.tooltip} maw={360} multiline>
            {content}
          </Tooltip>
        );
      }

      return content;
    },
    [dataset?.evaluatorConfigs],
  );

  const renderRunSlotCell = useCallback(
    (slot?: DatasetEvaluatorRunSlotSummary) => {
      if (!slot) {
        return (
          <Text size="xs" c="dimmed">
            —
          </Text>
        );
      }

      const hasResults =
        slot.evaluatedCount > 0 ||
        slot.passCount > 0 ||
        slot.failCount > 0 ||
        slot.unknownCount > 0;

      if (!hasResults) {
        return (
          <Text size="xs" c="dimmed">
            —
          </Text>
        );
      }

      const color =
        slot.passRate === null
          ? neutralMetricColor
          : getSuccessColor(slot.passRate);

      const label = formatPercentage(slot.passRate);

      return (
        <HoverCard withArrow withinPortal>
          <HoverCard.Target>
            <Text
              size="sm"
              fw={600}
              style={{ color, cursor: "default" }}
              component="span"
            >
              {label}
            </Text>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Stack gap={4}>
              <Text size="sm">{slot.passCount} passed</Text>
              <Text size="sm">{slot.failCount} failed</Text>
              <Text size="sm">{slot.unknownCount} unknown</Text>
              <Text size="xs" c="dimmed">
                {slot.evaluatedCount} evaluated
              </Text>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
      );
    },
    [formatPercentage, getSuccessColor, neutralMetricColor],
  );

  const handleSelectVersion = useCallback(
    (nextVersionId: "latest" | string) => {
      if (nextVersionId === selectedVersionId) {
        return true;
      }

      if (nextVersionId !== "latest" && hasPendingChanges) {
        notifications.show({
          title: "Save changes first",
          message:
            "Save or discard your unsaved changes before switching versions.",
          color: "yellow",
        });
        return false;
      }

      setEditingCell(null);
      setSelectedIds(new Set());
      setLastSelectedIndex(null);
      setSelectedVersionId(nextVersionId);
      return true;
    },
    [selectedVersionId, hasPendingChanges],
  );

  const handleRunRowClick = useCallback(
    (run: DatasetEvaluatorRun) => {
      if (!run.versionId) return;
      const switched = handleSelectVersion(run.versionId);
      if (switched) {
        handleTabChange("data");
      }
    },
    [handleSelectVersion, handleTabChange],
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
          `"input","ground_truth","output"`,
          ...displayItems.map((item) => {
            const input = `"${(item.input ?? "").replace(/"/g, '""')}"`;
            const groundTruth = item.groundTruth
              ? `"${item.groundTruth.replace(/"/g, '""')}"`
              : '""';
            const outputValue = item.output
              ? `"${item.output.replace(/"/g, '""')}"`
              : '""';
            return `${input},${groundTruth},${outputValue}`;
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
            output: item.output,
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
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="data">Data</Tabs.Tab>
          <Tabs.Tab value="runs">Runs</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="data" pt="lg">
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
                <Tooltip label={versionMenuLabel} withArrow>
                  <ActionIcon
                    variant="subtle"
                    aria-label={`Select version (${versionMenuLabel})`}
                    loading={versionMenuLoading}
                  >
                    <IconHistory size={16} />
                  </ActionIcon>
                </Tooltip>
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
                <Tooltip label="Download dataset" withArrow>
                  <ActionIcon
                    variant="subtle"
                    aria-label="Download dataset"
                  >
                    <IconDownload size={16} />
                  </ActionIcon>
                </Tooltip>
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
              leftSection={<IconPlayerPlayFilled size={16} />}
              onClick={handleGenerateOutputs}
              loading={isGeneratingPreview}
              disabled={
                !isViewingLatest || !hasPersistedItems || isGeneratingPreview
              }
            >
              Generate output
            </Button>
            {isViewingLatest ? (
              <>
                <Menu withinPortal>
                  <Menu.Target>
                    <Button
                      variant="default"
                      leftSection={<IconFlask size={16} />}
                      disabled={!isViewingLatest}
                      loading={isRunningEvaluators}
                    >
                      Test
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconPlayerPlayFilled size={16} />}
                      onClick={handleRunEvaluators}
                      disabled={isRunningEvaluators}
                    >
                      {isRunningEvaluators ? "Running…" : "Run all"}
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconPlus size={16} />}
                      onClick={() => openAddEvaluatorModal()}
                      disabled={
                        !isViewingLatest ||
                        !hasEvaluatorCapacity ||
                        isRunningEvaluators
                      }
                    >
                      Add evaluator
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Button
                  color="blue"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  loading={isSaving}
                >
                  Save
                </Button>
              </>
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
              w={220}
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

        <Card withBorder p={0}>
          <Box>
            <Table
              withColumnBorders
              withRowBorders
              highlightOnHover={false}
              verticalSpacing="sm"
              horizontalSpacing="md"
              style={{ tableLayout: "fixed" }}
                styles={(theme) => ({
                  thead: {
                    backgroundColor:
                      theme.colorScheme === "dark"
                        ? theme.colors.dark[6]
                        : theme.colors.gray[1],
                  },
                  th: {
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
                    <Table.Th w={46}>
                      <Checkbox
                        aria-label="Select all visible rows"
                        size="xs"
                        radius="sm"
                        styles={checkboxStyles}
                        checked={allVisibleSelected}
                        indeterminate={!allVisibleSelected && someVisibleSelected}
                        disabled={!isViewingLatest}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleSelectAllVisible();
                        }}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </Table.Th>
                    <Table.Th
                      style={{
                        width: equalColumnWidth,
                        minWidth: equalColumnWidth,
                        maxWidth: equalColumnWidth,
                      }}
                    >
                      Input
                    </Table.Th>
                    <Table.Th
                      style={{
                        width: equalColumnWidth,
                        minWidth: equalColumnWidth,
                        maxWidth: equalColumnWidth,
                      }}
                    >
                      Ground Truth
                    </Table.Th>
                    <Table.Th
                      style={{
                        width: equalColumnWidth,
                        minWidth: equalColumnWidth,
                        maxWidth: equalColumnWidth,
                      }}
                    >
                      Output
                    </Table.Th>
                    {displayEvaluatorSlots.map(({ slot, name }) => (
                      <Table.Th
                        key={`eval-header-${slot}`}
                        style={{
                          width: equalColumnWidth,
                          minWidth: equalColumnWidth,
                          maxWidth: equalColumnWidth,
                        }}
                      >
                        <Group gap="xs" justify="space-between" align="center">
                          <Group
                            gap={6}
                            align="center"
                            style={{ flex: 1, minWidth: 0 }}
                          >
                            <Text
                              size="sm"
                              fw={600}
                              title={typeof name === "string" ? name : undefined}
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "block",
                              }}
                            >
                              {name}
                            </Text>
                            {renderEvaluatorSuccess(slot)}
                          </Group>
                          <Menu withinPortal position="bottom-end">
                            <Menu.Target>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color={
                                  evaluatorFilters[slot] &&
                                  evaluatorFilters[slot] !== "all"
                                    ? "blue"
                                    : undefined
                                }
                                aria-label={`Filter evaluator ${name}`}
                              >
                                <IconFilter size={14} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                onClick={() => handleSetEvaluatorFilter(slot, "all")}
                                disabled={
                                  !evaluatorFilters[slot] ||
                                  evaluatorFilters[slot] === "all"
                                }
                              >
                                Show all
                              </Menu.Item>
                              <Menu.Item
                                onClick={() => handleSetEvaluatorFilter(slot, "pass")}
                                color="green"
                                disabled={evaluatorFilters[slot] === "pass"}
                              >
                                Show pass
                              </Menu.Item>
                              <Menu.Item
                                onClick={() => handleSetEvaluatorFilter(slot, "fail")}
                                color="red"
                                disabled={evaluatorFilters[slot] === "fail"}
                              >
                                Show fail
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                          {isViewingLatest && (
                            <Menu withinPortal position="bottom-end">
                              <Menu.Target>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  aria-label={`Evaluator ${name} actions`}
                                >
                                  <IconSettings size={14} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() => handleRemoveEvaluator(slot)}
                                >
                                  Remove evaluator
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          )}
                        </Group>
                      </Table.Th>
                    ))}
                    <Table.Th style={{ width: 62 }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredItems.map((item) =>
                    item.localId === "__add_row__" ? (
                      <Table.Tr key={item.localId}>
                        <Table.Td colSpan={2 + dataColumnCount}>
                          <Button
                            variant="subtle"
                            h={20}
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
                          w={46}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Checkbox
                            aria-label="Select row"
                            size="xs"
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
                            width: equalColumnWidth,
                            minWidth: equalColumnWidth,
                            maxWidth: equalColumnWidth,
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
                            width: equalColumnWidth,
                            minWidth: equalColumnWidth,
                            maxWidth: equalColumnWidth,
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
                        <Table.Td
                          style={{
                            cursor: "default",
                            width: equalColumnWidth,
                            minWidth: equalColumnWidth,
                            maxWidth: equalColumnWidth,
                          }}
                        >
                          {renderGeneratedOutput(item)}
                        </Table.Td>
                        {displayEvaluatorSlots.map(({ slot }) => (
                          <Table.Td
                            key={`${item.localId}-evaluator-${slot}`}
                            style={{
                              cursor: "default",
                              width: equalColumnWidth,
                              minWidth: equalColumnWidth,
                              maxWidth: equalColumnWidth,
                            }}
                          >
                            {renderEvaluatorResult(item, slot)}
                          </Table.Td>
                        ))}
                        <Table.Td style={{ cursor: "default", width: 62 }}>
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
        </Card>
    </Stack>

    <input
      type="file"
      ref={fileInputRef}
      hidden
      accept=".csv,.jsonl"
      onChange={handleFileInputChange}
    />

    <AddEvaluatorModal
      opened={addEvaluatorModalOpened}
      onClose={closeAddEvaluatorModal}
      evaluators={availableEvaluators}
      isLoading={isLoadingEvaluators}
      loading={isAttachingEvaluator}
      onConfirm={handleConfirmAddEvaluator}
    />

    <CellEditorModal
      opened={Boolean(editingCell)}
      onClose={closeEditor}
      field={editingCell?.field ?? "input"}
      value={
        editingCell
          ? (filteredItems[editingCell.index]?.[editingCell.field] ?? "") || ""
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
          You have unsaved changes in your dataset. If you leave now, they will
          be lost.
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

        </Tabs.Panel>

        <Tabs.Panel value="runs" pt="lg">
          {isLoadingRuns ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : runs.length === 0 ? (
            <Card withBorder>
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  No evaluator runs recorded yet.
                </Text>
                <Text size="xs" c="dimmed">
                  Run “Test → Run all” to generate the first evaluation summary.
                </Text>
              </Stack>
            </Card>
          ) : (
            <Stack gap="md">
              <Card withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={600}>Overall performance</Text>
                    {isValidatingRuns && <Loader size="xs" />}
                  </Group>
                  {overallRunStats.length ? (
                    <SimpleGrid
                      cols={{
                        base: 1,
                        sm: Math.min(2, overallRunStatsColumnCount),
                        lg: overallRunStatsColumnCount,
                      }}
                      spacing="md"
                    >
                      {overallRunStats.map((entry) => {
                        const color =
                          entry.passRate === null
                            ? neutralMetricColor
                            : getSuccessColor(entry.passRate);
                        const percentageLabel = formatPercentage(
                          entry.passRate,
                        );

                        return (
                          <Card
                            key={`${entry.slot}-${entry.evaluatorId ?? "none"}`}
                            withBorder
                            padding="md"
                          >
                            <Stack gap={6}>
                              <Group justify="space-between" align="center">
                                <Text size="sm" fw={600}>
                                  {entry.evaluatorName ?? `Evaluator ${entry.slot}`}
                                </Text>
                                <Text size="sm" fw={600} style={{ color }}>
                                  {percentageLabel}
                                </Text>
                              </Group>
                              <Progress
                                value={
                                  entry.passRate === null
                                    ? 0
                                    : Math.max(0, Math.min(100, entry.passRate))
                                }
                                styles={{ bar: { backgroundColor: color } }}
                              />
                              <Text size="xs" c="dimmed">
                                {entry.pass} passed · {entry.fail} failed · {entry.runCount} run
                                {entry.runCount === 1 ? "" : "s"}
                              </Text>
                            </Stack>
                          </Card>
                        );
                      })}
                    </SimpleGrid>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No evaluator results yet.
                    </Text>
                  )}
                </Stack>
              </Card>

              <Card withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={600}>Run history</Text>
                    {isValidatingRuns && <Loader size="xs" />}
                  </Group>
                  <Table withColumnBorders highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={220}>Run</Table.Th>
                        <Table.Th w={120}>Version</Table.Th>
                        <Table.Th w={140}>Items</Table.Th>
                        {runEvaluatorColumns.map((column) => (
                          <Table.Th key={`run-slot-${column.slot}`}>
                            {column.evaluatorName}
                          </Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {runs.map((run) => {
                        const slotMap = new Map(
                          run.slots.map((slot) => [slot.slot, slot] as const),
                        );
                        return (
                          <Table.Tr
                            key={run.id}
                            onClick={() => handleRunRowClick(run)}
                            style={{
                              cursor: run.versionId ? "pointer" : "default",
                            }}
                          >
                            <Table.Td>
                              <Stack gap={2} align="flex-start">
                                <Text size="sm" fw={600}>
                                  {formatDateTime(run.createdAt)}
                                </Text>
                                {run.createdByName || run.createdByEmail ? (
                                  <Text size="xs" c="dimmed">
                                    {run.createdByName ?? run.createdByEmail}
                                  </Text>
                                ) : null}
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2} align="flex-start">
                                <Text size="sm">
                                  {run.versionNumber
                                    ? `v${run.versionNumber}`
                                    : run.versionId
                                      ? "Version"
                                      : "—"}
                                </Text>
                                {run.versionCreatedAt ? (
                                  <Text size="xs" c="dimmed">
                                    {formatDateTime(run.versionCreatedAt)}
                                  </Text>
                                ) : null}
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2} align="flex-start">
                                <Text size="sm">
                                  {run.totalItems} item
                                  {run.totalItems === 1 ? "" : "s"}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {run.updatedItemCount} updated
                                </Text>
                              </Stack>
                            </Table.Td>
                            {runEvaluatorColumns.map((column) => (
                              <Table.Td key={`${run.id}-slot-${column.slot}`}>
                                {renderRunSlotCell(slotMap.get(column.slot))}
                              </Table.Td>
                            ))}
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Card>
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

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
