"use client";

import { useState, useMemo } from "react";
import { Button, Text, Container, Group, Title } from "@mantine/core";
import { ComparisonTable } from "@/components/comparison-table";
import { EvaluatorSettings } from "@/components/evaluator-settings";
import { IconPlus, IconPlayerPlay } from "@tabler/icons-react";
import type {
  ComparisonRow,
  ComparisonColumn,
  PromptVersion,
} from "@/types/prompt-types";
import type { EvaluatorConfig } from "@/types/evaluator-types";
import { useNotifications } from "@/hooks/use-notifications";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useTemplates } from "@/utils/dataHooks";
import { availableEvaluators } from "@/store/evaluators";

export function PromptComparator() {
  const { notify } = useNotifications();
  const { templates, loading: loadingTemplates } = useTemplates();
  const promptVersions: PromptVersion[] = useMemo(
    () =>
      templates
        ? templates.flatMap((template) =>
            template.versions.map((v) => ({
              id: v.id.toString(),
              templateId: template.id,
              name: v.version ? `v${v.version}` : `v${v.id}`,
              systemPrompt: Array.isArray(v.content)
                ? v.content.find((m) => m.role === "system")?.content || ""
                : typeof v.content === "string"
                  ? v.content
                  : "",
              model: v.extra.model as string,
              temperature: v.extra.temperature as number,
              max_tokens: v.extra.max_tokens as number,
              top_p: (v.extra as any).top_p || 0,
            })),
          )
        : [],
    [templates],
  );

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [evaluators, setEvaluators] =
    useState<EvaluatorConfig[]>(availableEvaluators);

  // Use predefined prompt versions
  const [comparisonColumns, setComparisonColumns] = useState<
    ComparisonColumn[]
  >([
    {
      id: "1",
      promptVersionId: null,
      promptTemplateId: null,
    },
    {
      id: "2",
      promptVersionId: null,
      promptTemplateId: null,
    },
  ]);

  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([
    {
      id: "1",
      userMessage: "",
      context: "",
      responses: {},
      evaluationResults: {},
    },
  ]);

  const addComparisonColumn = () => {
    const newId = (comparisonColumns.length + 1).toString();
    setComparisonColumns([
      ...comparisonColumns,
      {
        id: newId,
        promptVersionId: null,
        promptTemplateId: null,
      },
    ]);
  };

  const updateComparisonColumn = (updatedColumn: ComparisonColumn) => {
    console.log("Updating column:", updatedColumn);
    setComparisonColumns(
      comparisonColumns.map((column) =>
        column.id === updatedColumn.id ? updatedColumn : column,
      ),
    );
  };

  const addComparisonRow = () => {
    const newId = (comparisonRows.length + 1).toString();
    setComparisonRows([
      ...comparisonRows,
      {
        id: newId,
        userMessage: "",
        context: "",
        responses: {},
        evaluationResults: {},
      },
    ]);
  };

  const updateComparisonRow = (updatedRow: ComparisonRow) => {
    setComparisonRows(
      comparisonRows.map((row) =>
        row.id === updatedRow.id ? updatedRow : row,
      ),
    );
  };

  // no-op: promptVersions derived from useTemplates

  const removeComparisonRow = (rowId: string) => {
    if (comparisonRows.length <= 1) {
      notify({
        title: "Cannot remove row",
        description: "At least one row must remain in the table.",
        variant: "destructive",
      });
      return;
    }

    setComparisonRows(comparisonRows.filter((row) => row.id !== rowId));
  };

  const handleRunAll = async () => {
    try {
      setIsRunningAll(true);

      // Get all selected prompt versions
      const selectedVersions = comparisonColumns
        .filter((column) => column.promptVersionId)
        .map((column) => {
          const version = promptVersions.find(
            (v) => v.id === column.promptVersionId,
          );
          return { column, version };
        })
        .filter((item) => item.version);

      // Run each row for each selected version
      const updatedRows = [...comparisonRows];

      for (const row of updatedRows) {
        for (const { column, version } of selectedVersions) {
          if (!version) continue;

          try {
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
              throw new Error("Failed to run prompt");
            }

            const data = await response.json();

            row.responses = {
              ...row.responses,
              [column.id]: data.response,
            };

            // Reset evaluation results when generating a new response
            if (row.evaluationResults) {
              row.evaluationResults[column.id] = {};
            } else {
              row.evaluationResults = { [column.id]: {} };
            }
          } catch (error) {
            console.error(
              `Error running prompt for row ${row.id}, column ${column.id}:`,
              error,
            );
          }
        }
      }

      setComparisonRows(updatedRows);
      notify({
        title: "Completed",
        description: "All prompts have been processed",
      });
    } catch (error) {
      notify({
        title: "Error",
        description:
          "Failed to run prompts. Please check your API key and try again.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsRunningAll(false);
    }
  };

  const updateEvaluators = (updatedEvaluators: EvaluatorConfig[]) => {
    setEvaluators(updatedEvaluators);
  };

  const updatePromptVersion = (updatedVersion: PromptVersion) => {
    // Optionally update the version in local state or trigger mutate
    console.log("Prompt version updated:", updatedVersion);
  };

  const lastSaved = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  useKeyboardShortcut(["meta", "Enter"], handleRunAll);

  if (loadingTemplates) {
    return <Text>Loading prompts...</Text>;
  }
  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="md">
        <div>
          <Title order={3}>Experiments</Title>
        </div>
        <Group>
          <EvaluatorSettings
            evaluators={evaluators}
            onUpdateEvaluators={updateEvaluators}
          />
          <Button
            onClick={handleRunAll}
            disabled={isRunningAll}
            leftSection={<IconPlayerPlay size={16} />}
            rightSection={<Text size="xs">⌘ + ⏎</Text>}
          >
            Run All
          </Button>
        </Group>
      </Group>

      <ComparisonTable
        availablePromptVersions={promptVersions}
        availableTemplates={templates || []}
        comparisonColumns={comparisonColumns}
        comparisonRows={comparisonRows}
        evaluators={evaluators}
        updateRow={updateComparisonRow}
        updateColumn={updateComparisonColumn}
        updatePromptVersion={updatePromptVersion}
        onAddColumn={addComparisonColumn}
        onRemoveRow={removeComparisonRow}
      />

      <Button
        variant="outline"
        onClick={addComparisonRow}
        fullWidth
        mt="md"
        leftSection={<IconPlus size={16} />}
      >
        Add Row
      </Button>
    </Container>
  );
}
