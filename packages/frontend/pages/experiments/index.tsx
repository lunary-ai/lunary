import HotkeysInfo from "@/components/blocks/HotkeysInfo";
import { useOrg } from "@/utils/dataHooks";
import { usePrompts, usePromptVersions } from "@/utils/dataHooks/prompts";
import { fetcher } from "@/utils/fetcher";
import {
  Button,
  Group,
  Loader,
  Select,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconBolt } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Prompt, PromptVersion } from "shared/schemas/prompt";

export function PromptVersionSelect({ promptVersion, setPromptVersion }) {
  const { prompts } = usePrompts();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt>();

  const { promptVersions } = usePromptVersions(selectedPrompt?.id);

  const promptSelectData = prompts.map((prompt) => ({
    value: prompt.id.toString(),
    label: prompt.slug,
  }));

  const promptVersionSelectData = promptVersions.map((promptVersion) => ({
    value: promptVersion.id.toString(),
    label: `v${promptVersion.version}`,
  }));

  function onPromptChangeHandler(value: string | null) {
    if (value) {
      const promptId = Number.parseInt(value);
      const prompt = prompts.find((prompt) => prompt.id === promptId);
      setSelectedPrompt(prompt);
    }
  }

  function onPromptVersionChangeHandler(value: string | null) {
    if (value) {
      const promptVersionId = Number.parseInt(value);
      const promptVersion = promptVersions.find(
        (promptVersion) => promptVersion.id === promptVersionId,
      );
      setPromptVersion(promptVersion);
    }
  }

  return (
    <Group gap="0">
      <Select
        placeholder="Choose prompt"
        data={promptSelectData}
        onChange={onPromptChangeHandler}
        styles={{ input: { borderRadius: "8px 0 0 8px" } }}
      />
      <Select
        placeholder="Choose version"
        disabled={selectedPrompt === undefined}
        data={promptVersionSelectData}
        onChange={onPromptVersionChangeHandler}
        w={150}
        styles={{ input: { borderRadius: "0 8px 8px 0", borderLeft: "0" } }}
      />
    </Group>
  );
}

export function extractVariables(text: string): string[] {
  console.log(text);
  const placeholderRE = /{{\s*([A-Za-z_]\w*)\s*}}/g;
  const vars: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = placeholderRE.exec(text)) !== null) {
    vars.push(match[1]);
  }

  return vars;
}

export default function Experiments() {
  const { org } = useOrg();
  const { isLoading } = usePrompts();
  const [promptVersion, setPromptVersion] = useState<PromptVersion>();
  const variables = useMemo(
    () => extractVariables(JSON.stringify(promptVersion?.content)),
    [promptVersion?.content],
  );

  // manage multiple rows with unique IDs
  type Row = {
    id: number;
    variableValues: Record<string, string>;
    modelOutput: string;
    modelLoading: boolean;
    compResults: Record<number, { modelOutput: string; modelLoading: boolean }>; // added for comparison results
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [rowCounter, setRowCounter] = useState(0);

  // comparison columns state
  const [comparisonCols, setComparisonCols] = useState<
    { id: number; promptVersion?: PromptVersion }[]
  >([]);
  const [compCounter, setCompCounter] = useState(0);
  const handleAddComparison = () => {
    setComparisonCols((prev) => [...prev, { id: compCounter }]);
    setCompCounter((prev) => prev + 1);
  };
  const handleCompVersionChange = (id: number, pv: PromptVersion) => {
    setComparisonCols((prev) =>
      prev.map((col) => (col.id === id ? { ...col, promptVersion: pv } : col)),
    );
  };

  useEffect(() => {
    if (!promptVersion) return;
    const initialVars: Record<string, string> = {};
    variables.forEach((v) => {
      initialVars[v] = "";
    });
    const newRow: Row = {
      id: 0,
      variableValues: initialVars,
      modelOutput: "",
      modelLoading: false,
      compResults: {},
    };
    setRows([newRow]);
    setRowCounter(1);
  }, [promptVersion?.id, variables]);

  const handleAddRow = () => {
    const initialVars: Record<string, string> = {};
    variables.forEach((v) => {
      initialVars[v] = "";
    });
    const newRow: Row = {
      id: rowCounter,
      variableValues: initialVars,
      modelOutput: "",
      modelLoading: false,
      compResults: {},
    };
    setRows((prev) => [...prev, newRow]);
    setRowCounter((prev) => prev + 1);
  };

  // handle delete row
  const handleDeleteRow = (rowId: number) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // runs model for initial or comparison column
  const runModelRow = async (rowId: number, compId?: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (compId == null) return { ...r, modelLoading: true };
        const prevComp = r.compResults[compId] || {
          modelOutput: "",
          modelLoading: false,
        };
        return {
          ...r,
          compResults: {
            ...r.compResults,
            [compId]: { ...prevComp, modelLoading: true },
          },
        };
      }),
    );
    const targetPV =
      compId == null
        ? promptVersion
        : comparisonCols.find((c) => c.id === compId)?.promptVersion;
    if (!targetPV) return;
    try {
      const response = await fetcher.post(`/orgs/${org?.id}/playground`, {
        arg: {
          content: targetPV.content,
          extra: targetPV.extra,
          variables: rows.find((r) => r.id === rowId)?.variableValues,
        },
      });
      const output = response.choices[0].message.content as string;
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          if (compId == null) return { ...r, modelOutput: output };
          const prevComp = r.compResults[compId] || {
            modelOutput: "",
            modelLoading: false,
          };
          return {
            ...r,
            compResults: {
              ...r.compResults,
              [compId]: { ...prevComp, modelOutput: output },
            },
          };
        }),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          if (compId == null) return { ...r, modelLoading: false };
          const prevComp = r.compResults[compId] || {
            modelOutput: "",
            modelLoading: false,
          };
          return {
            ...r,
            compResults: {
              ...r.compResults,
              [compId]: { ...prevComp, modelLoading: false },
            },
          };
        }),
      );
    }
  };

  const runAll = () => {
    rows.forEach((r) => {
      runModelRow(r.id);
      comparisonCols.forEach((col) => runModelRow(r.id, col.id));
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rows, comparisonCols]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <Group justify="space-between" mb="sm">
        <Title order={3}>Experiments</Title>
        <Button
          leftSection={<IconBolt size="16" />}
          size="sm"
          disabled={!promptVersion}
          onClick={runAll}
          rightSection={
            <HotkeysInfo hot="Enter" size="sm" style={{ marginTop: -4 }} />
          }
        >
          Run all
        </Button>
      </Group>
      <Table withTableBorder withColumnBorders withRowBorders>
        <Table.Thead>
          <Table.Tr>
            {variables.map((variable) => (
              <Table.Th id={variable}></Table.Th>
            ))}
            <Table.Th>
              <PromptVersionSelect
                setPromptVersion={setPromptVersion}
                promptVersion={promptVersion}
              />
            </Table.Th>
            {comparisonCols.map((col) => (
              <Table.Th key={col.id}>
                <PromptVersionSelect
                  setPromptVersion={(pv) => handleCompVersionChange(col.id, pv)}
                  promptVersion={col.promptVersion}
                />
              </Table.Th>
            ))}
            <Table.Th>
              <Button size="sm" onClick={handleAddComparison}>
                Add Comparison
              </Button>
            </Table.Th>
          </Table.Tr>
          <Table.Tr>
            {variables.map((variable) => (
              <Table.Th id={variable}>{`{{${variable}}}`}</Table.Th>
            ))}
            <Table.Th>Model Output</Table.Th>
            {comparisonCols.map((col) => (
              <Table.Th key={col.id}>Model Output</Table.Th>
            ))}
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {promptVersion &&
            rows.map((row) => (
              <Table.Tr key={row.id}>
                {variables.map((variable) => (
                  <Table.Td key={variable} p={0}>
                    <Textarea
                      styles={{ input: { border: 0, borderRadius: 0 } }}
                      value={row.variableValues[variable] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  variableValues: {
                                    ...r.variableValues,
                                    [variable]: val,
                                  },
                                }
                              : r,
                          ),
                        );
                      }}
                    />
                  </Table.Td>
                ))}
                <Table.Td p={0}>
                  <Button
                    size="xs"
                    onClick={() => runModelRow(row.id)}
                    loading={row.modelLoading}
                    disabled={!promptVersion}
                  >
                    Run
                  </Button>
                  {row.modelOutput && (
                    <Text
                      size="sm"
                      style={{ whiteSpace: "pre-wrap", marginTop: 8 }}
                    >
                      {row.modelOutput}
                    </Text>
                  )}
                </Table.Td>
                {comparisonCols.map((col) => {
                  const comp = row.compResults[col.id] || {
                    modelOutput: "",
                    modelLoading: false,
                  };
                  return (
                    <Table.Td key={col.id} p={0}>
                      <Button
                        size="xs"
                        onClick={() => runModelRow(row.id, col.id)}
                        loading={comp.modelLoading}
                        disabled={!col.promptVersion}
                      >
                        Run
                      </Button>
                      {comp.modelOutput && (
                        <Text
                          size="sm"
                          style={{ whiteSpace: "pre-wrap", marginTop: 8 }}
                        >
                          {comp.modelOutput}
                        </Text>
                      )}
                    </Table.Td>
                  );
                })}
                <Table.Td>
                  <Button
                    size="xs"
                    color="red"
                    onClick={() => handleDeleteRow(row.id)}
                  >
                    Delete
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
        </Table.Tbody>
      </Table>
      <Group mt="md">
        <Button size="sm" onClick={handleAddRow}>
          Add row
        </Button>
      </Group>
    </>
  );
}
