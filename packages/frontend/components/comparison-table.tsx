import { useState } from "react";
import {
  Textarea,
  Paper,
  Group,
  Text,
  Box,
  Table,
  ScrollArea,
  Loader,
  ActionIcon,
  Tooltip,
  Stack,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconDotsVertical,
  IconSparkles,
  IconPlus,
  IconChartBar,
  IconTrash,
} from "@tabler/icons-react";
import type {
  PromptVersion,
  ComparisonRow,
  ComparisonColumn,
} from "@/types/prompt-types";
import type {
  EvaluatorConfig,
  EvaluationResult,
} from "@/types/evaluator-types";
import { EvaluationResults } from "@/components/evaluation-results";
import { PromptVersionSelector } from "@/components/prompt-version-selector";
import { useNotifications } from "@/hooks/use-notifications";

interface ComparisonTableProps {
  availablePromptVersions: PromptVersion[];
  comparisonColumns: ComparisonColumn[];
  comparisonRows: ComparisonRow[];
  evaluators: EvaluatorConfig[];
  updateRow: (row: ComparisonRow) => void;
  updateColumn: (column: ComparisonColumn) => void;
  updatePromptVersion: (version: PromptVersion) => void;
  showPrompts: boolean;
  onAddColumn: () => void;
  onRemoveRow?: (rowId: string) => void;
}

export function ComparisonTable({
  availablePromptVersions,
  comparisonColumns,
  comparisonRows,
  evaluators,
  updateRow,
  updateColumn,
  updatePromptVersion,
  showPrompts,
  onAddColumn,
  onRemoveRow,
}: ComparisonTableProps) {
  const { notify } = useNotifications();
  const [runningCells, setRunningCells] = useState<Record<string, boolean>>({});
  const [evaluatingCells, setEvaluatingCells] = useState<
    Record<string, boolean>
  >({});

  const handleInputChange = (
    rowId: string,
    field: "userMessage" | "context",
    value: string,
  ) => {
    const row = comparisonRows.find((r) => r.id === rowId);
    if (row) {
      updateRow({
        ...row,
        [field]: value,
      });
    }
  };

  const handleVersionChange = (columnId: string, promptVersionId: string) => {
    console.log(`Selecting version ${promptVersionId} for column ${columnId}`);
    const column = comparisonColumns.find((c) => c.id === columnId);
    if (column) {
      updateColumn({
        ...column,
        promptVersionId,
      });
    }
  };

  const handleUpdateVersion = (updatedVersion: PromptVersion) => {
    console.log("Updating version in table:", updatedVersion);
    updatePromptVersion(updatedVersion);
  };

  const handleRunPrompt = async (rowId: string, columnId: string) => {
    const column = comparisonColumns.find((c) => c.id === columnId);
    if (!column || !column.promptVersionId) return;

    const promptVersionId = column.promptVersionId;
    const cellId = `${rowId}-${columnId}`;

    try {
      setRunningCells((prev) => ({ ...prev, [cellId]: true }));

      const row = comparisonRows.find((r) => r.id === rowId);
      const version = availablePromptVersions.find(
        (v) => v.id === promptVersionId,
      );

      if (!row || !version) return;

      // Use fetch to call our API route
      const response = await fetch("/api/run-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version,
          userMessage: row.userMessage,
          context: row.context,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();

      const updatedRow = {
        ...row,
        responses: {
          ...row.responses,
          [columnId]: data.response,
        },
        // Reset evaluation results when generating a new response
        evaluationResults: {
          ...(row.evaluationResults || {}),
          [columnId]: {},
        },
      };

      updateRow(updatedRow);
    } catch (error) {
      notify({
        title: "Error",
        description:
          "Failed to run prompt. Please check your API key and try again.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setRunningCells((prev) => ({ ...prev, [cellId]: false }));
    }
  };

  const handleEvaluateResponse = async (rowId: string, columnId: string) => {
    const column = comparisonColumns.find((c) => c.id === columnId);
    if (!column || !column.promptVersionId) return;

    const cellId = `${rowId}-${columnId}-evaluate`;

    try {
      setEvaluatingCells((prev) => ({ ...prev, [cellId]: true }));

      const row = comparisonRows.find((r) => r.id === rowId);
      if (!row) return;

      const response = row.responses[columnId];
      if (!response) {
        notify({
          title: "No response to evaluate",
          description: "Please generate a response first before evaluating.",
          variant: "destructive",
        });
        return;
      }

      // Get enabled evaluators
      const enabledEvaluators = evaluators.filter((e) => e.enabled);
      if (enabledEvaluators.length === 0) {
        notify({
          title: "No evaluators enabled",
          description: "Please enable at least one evaluator in the settings.",
          variant: "destructive",
        });
        return;
      }

      // Run each evaluator
      const evaluationResults: Record<string, EvaluationResult> = {};
      const failedEvaluators: string[] = [];
      let successCount = 0;

      for (const evaluator of enabledEvaluators) {
        try {
          console.log(`Running evaluator: ${evaluator.name}`);

          // Add retry logic for evaluators
          let result;
          let retries = 2;
          let success = false;

          while (retries > 0 && !success) {
            try {
              result = await fetch("/api/evaluate", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  evaluator,
                  userMessage: row.userMessage,
                  context: row.context,
                  response,
                }),
              });

              if (result.ok) {
                success = true;
              } else {
                console.log(
                  `Retry needed for ${evaluator.name}, status: ${result.status}`,
                );
                retries--;
                // Wait a bit before retrying
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            } catch (fetchError) {
              console.error(`Fetch error for ${evaluator.name}:`, fetchError);
              retries--;
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          if (!success || !result || !result.ok) {
            throw new Error(
              `API returned status ${result?.status || "unknown"}`,
            );
          }

          const evaluation = await result.json();

          if (!evaluation || typeof evaluation.score !== "number") {
            throw new Error(
              `Invalid evaluation result: ${JSON.stringify(evaluation)}`,
            );
          }

          evaluationResults[evaluator.id] = {
            evaluatorId: evaluator.id,
            score: evaluation.score,
            feedback: evaluation.feedback || "No feedback provided",
          };

          successCount++;
        } catch (error) {
          console.error(`Error running evaluator ${evaluator.name}:`, error);
          failedEvaluators.push(evaluator.name);

          evaluationResults[evaluator.id] = {
            evaluatorId: evaluator.id,
            score: 0.5,
            feedback: `Failed to run evaluator: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      }

      const updatedRow = {
        ...row,
        evaluationResults: {
          ...(row.evaluationResults || {}),
          [columnId]: evaluationResults,
        },
      };

      updateRow(updatedRow);

      if (failedEvaluators.length > 0) {
        if (successCount > 0) {
          notify({
            title: "Some evaluators failed",
            description: `Completed ${successCount} evaluations. Failed: ${failedEvaluators.join(", ")}. Default scores were used for failed evaluators.`,
            variant: "destructive",
          });
        } else {
          notify({
            title: "All evaluators failed",
            description: `Failed evaluators: ${failedEvaluators.join(", ")}. Default scores were used.`,
            variant: "destructive",
          });
        }
      } else {
        notify({
          title: "Evaluation complete",
          description: `Completed ${enabledEvaluators.length} evaluations`,
        });
      }
    } catch (error) {
      notify({
        title: "Error",
        description: "Failed to evaluate response.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setEvaluatingCells((prev) => ({ ...prev, [cellId]: false }));
    }
  };

  const generateTestCase = async (rowId: string) => {
    try {
      const row = comparisonRows.find((r) => r.id === rowId);
      if (!row) return;

      const cellId = `${rowId}-generate`;
      setRunningCells((prev) => ({ ...prev, [cellId]: true }));

      // Generate a new user message using OpenAI
      const response = await fetch("/api/generate-test-case", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rowId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate test case");
      }

      const data = await response.json();

      // Update the row with the generated content
      updateRow({
        ...row,
        userMessage: data.userMessage,
        context: data.context,
        // Reset responses and evaluations when generating a new test case
        responses: {},
        evaluationResults: {},
      });

      notify({
        title: "Test Case Generated",
        description: "A new test case has been generated successfully",
      });
    } catch (error) {
      notify({
        title: "Error",
        description: "Failed to generate test case",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      const cellId = `${rowId}-generate`;
      setRunningCells((prev) => ({ ...prev, [cellId]: false }));
    }
  };

  const handleRemoveRow = (rowId: string) => {
    if (comparisonRows.length <= 1) {
      notify({
        title: "Cannot remove row",
        description: "At least one row must remain in the table.",
        variant: "destructive",
      });
      return;
    }

    if (onRemoveRow) {
      onRemoveRow(rowId);
    }
  };

  return (
    <Box style={{ border: "1px solid #e9ecef", borderRadius: "4px" }}>
      <ScrollArea h={800}>
        <Table striped highlightOnHover>
          <Table.Thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: "white",
            }}
          >
            <Table.Tr>
              <Table.Th style={{ width: "40px" }}></Table.Th>
              <Table.Th style={{ width: "250px" }}></Table.Th>
              <Table.Th style={{ width: "250px" }}></Table.Th>

              {comparisonColumns.map((column) => {
                const promptVersion = column.promptVersionId
                  ? availablePromptVersions.find(
                      (v) => v.id === column.promptVersionId,
                    )
                  : null;

                return (
                  <Table.Th key={column.id} style={{ width: "300px" }}>
                    <Stack gap="xs">
                      <PromptVersionSelector
                        version={
                          promptVersion || {
                            id: "",
                            name: "Select version",
                            systemPrompt: "",
                            model: "gpt-4o",
                            temperature: 1.0,
                            max_tokens: 2048,
                            top_p: 1.0,
                          }
                        }
                        availableVersions={availablePromptVersions}
                        onSelectVersion={(versionId) =>
                          handleVersionChange(column.id, versionId)
                        }
                        onUpdateVersion={handleUpdateVersion}
                      />

                      {showPrompts && promptVersion && (
                        <Paper
                          p="xs"
                          withBorder
                          bg="gray.0"
                          style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}
                        >
                          {promptVersion.systemPrompt}
                        </Paper>
                      )}
                    </Stack>
                  </Table.Th>
                );
              })}

              <Table.Th style={{ width: "40px" }} rowSpan={2}>
                <Tooltip label="Add column">
                  <ActionIcon variant="subtle" onClick={onAddColumn}>
                    <IconPlus size={16} />
                  </ActionIcon>
                </Tooltip>
              </Table.Th>
            </Table.Tr>

            <Table.Tr>
              <Table.Th>
                <Text size="xs" c="dimmed">
                  #
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" c="dimmed">
                  {"{USER_MESSAGE}"}
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" c="dimmed">
                  {"{CONTEXT}"}
                </Text>
              </Table.Th>

              {comparisonColumns.map((column) => (
                <Table.Th key={`header-${column.id}`}>
                  <Text size="xs" c="dimmed">
                    Model Output
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {comparisonRows.map((row, index) => (
              <Table.Tr key={row.id}>
                <Table.Td>
                  <Stack align="center" gap="xs">
                    <Text>{index + 1}</Text>
                    <Group gap="xs">
                      <Tooltip label="Generate test case">
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() => generateTestCase(row.id)}
                          disabled={runningCells[`${row.id}-generate`]}
                        >
                          <IconSparkles size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip
                        label={
                          comparisonRows.length <= 1
                            ? "Cannot remove the only row"
                            : "Remove row"
                        }
                      >
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          color="red"
                          onClick={() => handleRemoveRow(row.id)}
                          disabled={comparisonRows.length <= 1}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Stack>
                </Table.Td>

                <Table.Td>
                  <Textarea
                    value={row.userMessage}
                    onChange={(e) =>
                      handleInputChange(
                        row.id,
                        "userMessage",
                        e.currentTarget.value,
                      )
                    }
                    placeholder="Enter user message..."
                    minRows={4}
                    autosize
                  />
                </Table.Td>

                <Table.Td>
                  <Textarea
                    value={row.context}
                    onChange={(e) =>
                      handleInputChange(
                        row.id,
                        "context",
                        e.currentTarget.value,
                      )
                    }
                    placeholder="Enter context..."
                    minRows={4}
                    autosize
                  />
                </Table.Td>

                {comparisonColumns.map((column) => {
                  const cellId = `${row.id}-${column.id}`;
                  const evaluateCellId = `${cellId}-evaluate`;
                  const isRunning = runningCells[cellId];
                  const isEvaluating = evaluatingCells[evaluateCellId];
                  const response = row.responses[column.id];
                  const evaluationResults = row.evaluationResults?.[column.id];

                  return (
                    <Table.Td key={column.id} style={{ verticalAlign: "top" }}>
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Tooltip label="Run prompt">
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={() =>
                                  handleRunPrompt(row.id, column.id)
                                }
                                disabled={isRunning || !column.promptVersionId}
                              >
                                <IconPlayerPlay size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Evaluate response">
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={() =>
                                  handleEvaluateResponse(row.id, column.id)
                                }
                                disabled={
                                  isEvaluating ||
                                  !response ||
                                  !column.promptVersionId
                                }
                              >
                                <IconChartBar size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                          <ActionIcon variant="subtle" size="sm">
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Group>

                        <Paper
                          p="xs"
                          withBorder
                          bg="gray.0"
                          h={200}
                          style={{ overflow: "auto" }}
                        >
                          {isRunning ? (
                            <Group justify="center" h="100%">
                              <Loader size="sm" />
                              <Text size="sm">Processing...</Text>
                            </Group>
                          ) : isEvaluating ? (
                            <Group justify="center" h="100%">
                              <Loader size="sm" />
                              <Text size="sm">Evaluating...</Text>
                            </Group>
                          ) : response ? (
                            <Text style={{ whiteSpace: "pre-wrap" }}>
                              {response}
                            </Text>
                          ) : (
                            <Text
                              c="dimmed"
                              ta="center"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                              }}
                            >
                              {column.promptVersionId
                                ? "Click Run to generate response"
                                : "Select a prompt version"}
                            </Text>
                          )}
                        </Paper>

                        {evaluationResults &&
                          Object.keys(evaluationResults).length > 0 && (
                            <EvaluationResults
                              results={evaluationResults}
                              evaluators={evaluators}
                            />
                          )}
                      </Stack>
                    </Table.Td>
                  );
                })}

                <Table.Td></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Box>
  );
}
