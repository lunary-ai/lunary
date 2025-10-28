import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Container,
  Group,
  HoverCard,
  Loader,
  Stack,
  Table,
  TextInput,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMantineTheme } from "@mantine/core";
import {
  IconChevronLeft,
  IconRefresh,
  IconArrowLeft,
  IconInfoCircle,
  IconPencil,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import {
  useDatasetV2,
  useDatasetV2EvaluatorRuns,
  type DatasetEvaluatorRun,
  type DatasetEvaluatorRunSlotSummary,
} from "@/utils/dataHooks/dataset";
import { formatDateTime } from "@/utils/format";

export default function DatasetV2RunsPage() {
  const router = useRouter();
  const datasetId =
    typeof router.query.id === "string" ? router.query.id : undefined;

  const {
    dataset,
    isLoading: isDatasetLoading,
  } = useDatasetV2(datasetId);

  const {
    runs,
    isLoading,
    isValidating,
    mutate,
    updateRunName,
    isUpdatingRun,
  } = useDatasetV2EvaluatorRuns(datasetId);

  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [runNameDraft, setRunNameDraft] = useState("");

  const theme = useMantineTheme();
  const isDark = theme.colorScheme === "dark";

  const getPassRatePalette = useCallback(
    (value: number | null) => {
      if (value === null) {
        return {
          foreground: isDark ? theme.colors.gray[3] : theme.colors.gray[7],
          background: isDark ? theme.colors.dark[5] : theme.colors.gray[1],
          border: isDark ? theme.colors.dark[4] : theme.colors.gray[3],
        };
      }

      const palette =
        value >= 85
          ? theme.colors.green
          : value >= 50
            ? theme.colors.yellow
            : theme.colors.red;

      const foreground = palette[isDark ? 3 : 7];
      const background = theme.fn.rgba(palette[isDark ? 4 : 3], isDark ? 0.28 : 0.14);
      const border = theme.fn.rgba(palette[isDark ? 5 : 5], isDark ? 0.5 : 0.28);

      return { foreground, background, border };
    },
    [isDark, theme.colors, theme.fn],
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

  const computeRunAverage = useCallback((run: DatasetEvaluatorRun) => {
    let passed = 0;
    let evaluated = 0;

    run.slots.forEach((slot) => {
      passed += slot.passCount ?? 0;
      evaluated += slot.evaluatedCount ?? 0;
    });

    if (evaluated === 0) {
      return null;
    }

    return Number(((passed / evaluated) * 100).toFixed(1));
  }, []);

  const getRunDisplayName = useCallback(
    (run: DatasetEvaluatorRun) => {
      if (typeof run.name === "string" && run.name.trim()) {
        return run.name.trim();
      }

      if (run.versionNumber) {
        return `Dataset version v${run.versionNumber}`;
      }

      return formatDateTime(run.createdAt);
    },
    [],
  );

  const handleStartEditingRun = useCallback(
    (run: DatasetEvaluatorRun) => {
      setEditingRunId(run.id);
      setRunNameDraft(run.name ?? "");
    },
    [],
  );

  const handleCancelEditingRun = useCallback(() => {
    setEditingRunId(null);
    setRunNameDraft("");
  }, []);

  const handleConfirmEditingRun = useCallback(async () => {
    if (!editingRunId) return;
    const targetRun = runs.find((entry) => entry.id === editingRunId);
    const trimmed = runNameDraft.trim();
    const original = (targetRun?.name ?? "").trim();

    if (trimmed === original) {
      setEditingRunId(null);
      setRunNameDraft("");
      return;
    }

    try {
      await updateRunName(editingRunId, trimmed.length ? trimmed : null);
      setEditingRunId(null);
      setRunNameDraft("");
    } catch (error) {
      // fetcher handles error display; keep editing state for user correction
    }
  }, [editingRunId, runNameDraft, updateRunName, runs]);

  const renderPassRatePill = useCallback(
    (value: number | null) => {
      const palette = getPassRatePalette(value);
      return (
        <Box
          component="span"
          px="sm"
          py={6}
          style={{
            display: "flex",
            width: "100%",
            minHeight: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            backgroundColor: palette.background,
            border: `1px solid ${palette.border}`,
            color: palette.foreground,
            fontWeight: 600,
          }}
        >
          {formatPercentage(value)}
        </Box>
      );
    },
    [formatPercentage, getPassRatePalette],
  );

  const renderRunSlotCell = useCallback(
    (slot?: DatasetEvaluatorRunSlotSummary) => {
      if (!slot) {
        return renderPassRatePill(null);
      }

      return (
        <HoverCard withArrow withinPortal>
          <HoverCard.Target>{renderPassRatePill(slot.passRate)}</HoverCard.Target>
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
    [renderPassRatePill],
  );

  const handleRunRowClick = useCallback(
    (run: DatasetEvaluatorRun) => {
      if (editingRunId) return;
      if (!datasetId || !run.versionId) return;
      router.push(`/datasets/v2/${datasetId}?version=${run.versionId}`);
    },
    [datasetId, router, editingRunId],
  );

  const handleReturnToDataset = useCallback(() => {
    if (!datasetId) return;
    router.push(`/datasets/v2/${datasetId}`);
  }, [datasetId, router]);

  const handleReturnToList = useCallback(() => {
    router.push("/datasets/v2");
  }, [router]);

  const handleRefresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  if (!datasetId) {
    return (
      <Container fluid py="lg" px="lg">
        <Alert color="red" title="Dataset not found">
          Return to the dataset list and try again.
        </Alert>
      </Container>
    );
  }

  if (!isDatasetLoading && !dataset) {
    return (
      <Container fluid py="lg" px="lg">
        <Stack gap="md">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={handleReturnToList}
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

  const datasetName = dataset?.name ?? "Dataset";

  return (
    <Container fluid py="lg" px="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group align="center" gap="sm">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={handleReturnToDataset}
              aria-label="Back to dataset"
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Stack gap={2}>
              <Title order={2}>{datasetName}</Title>
              <Text size="sm" c="dimmed">
                Evaluator runs
              </Text>
            </Stack>
          </Group>
          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              aria-label="Refresh runs"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <IconRefresh size={16} />
            </ActionIcon>
            {isValidating && (
              <Group gap={6}>
                <Loader size="xs" />
                <Text size="xs" c="dimmed">
                  Syncing…
                </Text>
              </Group>
            )}
          </Group>
        </Group>

        {isLoading && runs.length === 0 ? (
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
                Run “Test → Run all” from the dataset page to generate the first
                evaluation summary.
              </Text>
            </Stack>
          </Card>
        ) : (
          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={600}>Runs</Text>
                {isValidating && runs.length > 0 && <Loader size="xs" />}
              </Group>
              <Table withColumnBorders highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={260}>Run</Table.Th>
                    <Table.Th w={140}>Score</Table.Th>
                    {runEvaluatorColumns.map((column) => (
                      <Table.Th key={`run-slot-${column.slot}`}>
                        <Text
                          size="sm"
                          fw={600}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={column.evaluatorName}
                        >
                          {column.evaluatorName}
                        </Text>
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {runs.map((run) => {
                    const slotMap = new Map(
                      run.slots.map((slot) => [slot.slot, slot] as const),
                    );
                    const canNavigate = Boolean(run.versionId);
                    const averagePassRate = computeRunAverage(run);
                    const isEditing = editingRunId === run.id;
                    const displayName = getRunDisplayName(run);
                    const tooltipContent = (
                      <Stack gap={4} maw={280}>
                        <Text size="sm">Started: {formatDateTime(run.createdAt)}</Text>
                        {run.versionNumber ? (
                          <Text size="sm">Version: v{run.versionNumber}</Text>
                        ) : null}
                        <Text size="sm">
                          Items updated: {run.updatedItemCount} / {run.totalItems}
                        </Text>
                        {run.createdByName || run.createdByEmail ? (
                          <Text size="sm">
                            By: {run.createdByName ?? run.createdByEmail}
                          </Text>
                        ) : null}
                      </Stack>
                    );

                    const handleRowClick = () => {
                      if (editingRunId) return;
                      if (!canNavigate) return;
                      handleRunRowClick(run);
                    };

                    return (
                      <Table.Tr
                        key={run.id}
                        onClick={handleRowClick}
                        style={{
                          cursor:
                            editingRunId || !canNavigate ? "default" : "pointer",
                        }}
                      >
                        <Table.Td>
                          <Stack gap={4} align="flex-start">
                            {isEditing ? (
                              <Group gap={6} align="center" wrap="nowrap">
                                <TextInput
                                  value={runNameDraft}
                                  onChange={(event) =>
                                    setRunNameDraft(event.currentTarget.value)
                                  }
                                  placeholder={displayName}
                                  size="sm"
                                  miw={200}
                                  disabled={isUpdatingRun}
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void handleConfirmEditingRun();
                                    } else if (event.key === "Escape") {
                                      event.preventDefault();
                                      handleCancelEditingRun();
                                    }
                                  }}
                                />
                                <ActionIcon
                                  variant="filled"
                                  size="sm"
                                  color="blue"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (isUpdatingRun) return;
                                    void handleConfirmEditingRun();
                                  }}
                                  disabled={isUpdatingRun}
                                >
                                  {isUpdatingRun ? (
                                    <Loader size="xs" />
                                  ) : (
                                    <IconCheck size={16} />
                                  )}
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  size="sm"
                                  color="gray"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCancelEditingRun();
                                  }}
                                >
                                  <IconX size={16} />
                                </ActionIcon>
                                <Tooltip label={tooltipContent} withArrow withinPortal>
                                  <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    color="gray"
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label="Run details"
                                  >
                                    <IconInfoCircle size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            ) : (
                              <Group gap={6} align="center">
                                <Text size="sm" fw={600}>
                                  {displayName}
                                </Text>
                                <Tooltip label="Edit run name" withArrow withinPortal>
                                  <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    color="gray"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleStartEditingRun(run);
                                    }}
                                    aria-label="Edit run name"
                                  >
                                    <IconPencil size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label={tooltipContent} withArrow withinPortal>
                                  <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    color="gray"
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label="Run details"
                                  >
                                    <IconInfoCircle size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            )}
                            <Group gap={6} align="center">
                              {run.versionNumber ? (
                                <Text size="xs" c="dimmed">
                                  {formatDateTime(run.createdAt)}
                                </Text>
                              ) : null}
                              {run.createdByName || run.createdByEmail ? (
                                <Text size="xs" c="dimmed">
                                  {run.createdByName ?? run.createdByEmail}
                                </Text>
                              ) : null}
                            </Group>
                          </Stack>
                        </Table.Td>
                        <Table.Td>{renderPassRatePill(averagePassRate)}</Table.Td>
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
        )}
      </Stack>
    </Container>
  );
}
