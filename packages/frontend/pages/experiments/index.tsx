import HotkeysInfo from "@/components/blocks/HotkeysInfo";
import { useOrg } from "@/utils/dataHooks";
import { Evaluator } from "@/utils/dataHooks/evaluators";
import { usePrompts, usePromptVersions } from "@/utils/dataHooks/prompts";
import { fetcher } from "@/utils/fetcher";

import EVALUATOR_TYPES from "@/utils/evaluators";
import {
  Button,
  Fieldset,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconBolt, IconPlus, IconSettings } from "@tabler/icons-react";
import { KeyboardEvent, useEffect, useMemo, useReducer, useState } from "react";
import { CheckLogic } from "shared";
import { Prompt, PromptVersion } from "shared/schemas/prompt";
import { EvaluatorCard } from "../evaluators/new";

export function extractVariables(text = ""): string[] {
  const re = /{{\s*([A-Za-z_]\w*)\s*}}/g;
  const vars: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) vars.push(match[1]);
  return vars;
}

const buildInitialParams = (evaluator: any): CheckLogic => {
  if (evaluator.id === "llm") {
    return {
      id: "llm",
      params: {
        modelId: "",
        scoringType: "boolean",
        prompt: "",
        categories: [],
      },
    };
  }
  // Generic param initialiser
  const init = (evaluator.params as any[]).reduce<Record<string, any>>(
    (acc, p) => {
      if ("id" in p) acc[p.id] = p.defaultValue;
      return acc;
    },
    {},
  );
  return { id: evaluator.id, params: init };
};

function PromptVersionSelect({
  promptVersion,
  setPromptVersion,
}: {
  promptVersion?: PromptVersion;
  setPromptVersion: (pv?: PromptVersion) => void;
}) {
  const { prompts } = usePrompts();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt>();
  const { promptVersions } = usePromptVersions(selectedPrompt?.id);

  const promptOpts = prompts.map((p) => ({
    value: p.id.toString(),
    label: p.slug,
  }));
  const versionOpts = promptVersions.map((pv) => ({
    value: pv.id.toString(),
    label: `v${pv.version}`,
  }));

  return (
    <Group gap="0">
      <Select
        placeholder="Choose prompt"
        data={promptOpts}
        onChange={(v) =>
          setSelectedPrompt(prompts.find((p) => p.id === Number(v)))
        }
        styles={{ input: { borderRadius: "8px 0 0 8px" } }}
      />
      <Select
        placeholder="Choose version"
        disabled={!selectedPrompt}
        data={versionOpts}
        onChange={(v) =>
          setPromptVersion(promptVersions.find((pv) => pv.id === Number(v)))
        }
        w={promptVersion ? 60 : 150}
        styles={{ input: { borderRadius: "0 8px 8px 0", borderLeft: 0 } }}
        comboboxProps={{ width: 80 }}
      />
    </Group>
  );
}

/* ──────────────────────── Types & table reducer ────────────────────── */

interface EvalResult {
  passed: boolean;
  loading: boolean;
}
interface CompResult {
  modelOutput: string;
  modelLoading: boolean;
}
interface Row {
  id: number;
  variableValues: Record<string, string>;
  modelOutput: string;
  modelLoading: boolean;
  compResults: Record<number, CompResult>;
  evalResults: Record<string, EvalResult>;
}
interface Comparison {
  id: number;
  promptVersion?: PromptVersion;
}
interface State {
  promptVersion?: PromptVersion;
  rows: Row[];
  nextRowId: number;
  comparisons: Comparison[];
  nextCompId: number;
}

const emptyVarMap = (vars: string[]) =>
  vars.reduce((acc, v) => ({ ...acc, [v]: "" }), {} as Record<string, string>);

const makeRow = (id: number, vars: string[]): Row => ({
  id,
  variableValues: emptyVarMap(vars),
  modelOutput: "",
  modelLoading: false,
  compResults: {},
  evalResults: {},
});

type Action =
  | { type: "INIT_ROWS"; vars: string[] }
  | { type: "ADD_ROW"; vars: string[] }
  | { type: "DELETE_ROW"; rowId: number }
  | { type: "SET_VAR"; rowId: number; varName: string; value: string }
  | { type: "SET_MODEL_LOADING"; rowId: number; compId?: number; flag: boolean }
  | { type: "SET_MODEL_OUTPUT"; rowId: number; compId?: number; output: string }
  | { type: "SET_EVAL_LOADING"; rowId: number; ids: string[] }
  | { type: "SET_EVAL_RESULT"; rowId: number; id: string; passed: boolean }
  | { type: "ADD_COMP" }
  | { type: "SET_COMP_PV"; compId: number; pv?: PromptVersion }
  | { type: "SET_PROMPT_VERSION"; promptVersion?: PromptVersion };

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "SET_PROMPT_VERSION":
      return { ...state, promptVersion: a.promptVersion };

    case "INIT_ROWS":
      return { ...state, rows: [makeRow(0, a.vars)], nextRowId: 1 };

    case "ADD_ROW":
      return {
        ...state,
        rows: [...state.rows, makeRow(state.nextRowId, a.vars)],
        nextRowId: state.nextRowId + 1,
      };

    case "DELETE_ROW":
      return { ...state, rows: state.rows.filter((r) => r.id !== a.rowId) };

    case "SET_VAR":
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === a.rowId
            ? {
                ...r,
                variableValues: { ...r.variableValues, [a.varName]: a.value },
              }
            : r,
        ),
      };

    case "SET_MODEL_LOADING":
      return {
        ...state,
        rows: state.rows.map((r) => {
          if (r.id !== a.rowId) return r;
          if (a.compId == null) return { ...r, modelLoading: a.flag };
          const prev = r.compResults[a.compId] ?? {
            modelOutput: "",
            modelLoading: false,
          };
          return {
            ...r,
            compResults: {
              ...r.compResults,
              [a.compId]: { ...prev, modelLoading: a.flag },
            },
          };
        }),
      };

    case "SET_MODEL_OUTPUT":
      return {
        ...state,
        rows: state.rows.map((r) => {
          if (r.id !== a.rowId) return r;
          if (a.compId == null) return { ...r, modelOutput: a.output };
          const prev = r.compResults[a.compId] ?? {
            modelOutput: "",
            modelLoading: false,
          };
          return {
            ...r,
            compResults: {
              ...r.compResults,
              [a.compId]: { ...prev, modelOutput: a.output },
            },
          };
        }),
      };

    case "SET_EVAL_LOADING":
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === a.rowId
            ? {
                ...r,
                evalResults: a.ids.reduce<Record<string, EvalResult>>(
                  (acc, id) => ({
                    ...acc,
                    [id]: { passed: false, loading: true },
                  }),
                  { ...r.evalResults },
                ),
              }
            : r,
        ),
      };

    case "SET_EVAL_RESULT":
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === a.rowId
            ? {
                ...r,
                evalResults: {
                  ...r.evalResults,
                  [a.id]: { passed: a.passed, loading: false },
                },
              }
            : r,
        ),
      };

    case "ADD_COMP":
      return {
        ...state,
        comparisons: [...state.comparisons, { id: state.nextCompId }],
        nextCompId: state.nextCompId + 1,
      };

    case "SET_COMP_PV":
      return {
        ...state,
        comparisons: state.comparisons.map((c) =>
          c.id === a.compId ? { ...c, promptVersion: a.pv } : c,
        ),
      };

    default:
      return state;
  }
}

export default function Experiments() {
  const { org } = useOrg();
  usePrompts();

  const evaluators = Object.values(EVALUATOR_TYPES).filter((e) => {
    if (e.beta && !org.beta) return false;
    return true;
  });

  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedEvalIds, setSelectedEvalIds] = useState<string[]>([]);
  const [activeEvalId, setActiveEvalId] = useState<string | undefined>();
  const [paramsMap, setParamsMap] = useState<Record<string, CheckLogic>>({});
  const [showPrompt, setShowPrompt] = useState(true);

  const [state, dispatch] = useReducer(reducer, {
    promptVersion: undefined,
    rows: [],
    nextRowId: 0,
    comparisons: [],
    nextCompId: 0,
  });

  const vars = useMemo(
    () => extractVariables(JSON.stringify(state.promptVersion?.content ?? "")),
    [state],
  );

  useEffect(() => {
    if (state.promptVersion) dispatch({ type: "INIT_ROWS", vars });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.promptVersion?.id, vars.join(",")]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const runModelRow = async (rowId: number, compId?: number) => {
    dispatch({ type: "SET_MODEL_LOADING", rowId, compId, flag: true });

    const targetPV =
      compId == null
        ? state.promptVersion
        : state.comparisons.find((c) => c.id === compId)?.promptVersion;
    if (!targetPV) return;

    const row = state.rows.find((r) => r.id === rowId);
    if (!row) return;

    try {
      const resp = await fetcher.post(`/orgs/${org?.id}/playground`, {
        arg: {
          content: targetPV.content,
          extra: targetPV.extra,
          variables: row.variableValues,
        },
      });
      const output = resp.choices[0].message.content as string;
      dispatch({ type: "SET_MODEL_OUTPUT", rowId, compId, output });
    } catch (err) {
      console.error(err);
    } finally {
      dispatch({ type: "SET_MODEL_LOADING", rowId, compId, flag: false });
    }
  };

  const runAll = () => {
    state.rows.forEach((r) => {
      runModelRow(r.id);
      state.comparisons.forEach((c) => runModelRow(r.id, c.id));
    });
  };

  const runEvaluators = async (rowId: number, compId?: number) => {
    if (!selectedEvalIds.length) return;
    dispatch({ type: "SET_EVAL_LOADING", rowId, ids: selectedEvalIds });

    const targetPV =
      compId == null
        ? state.promptVersion
        : state.comparisons.find((c) => c.id === compId)?.promptVersion;
    if (!targetPV) return;

    const row = state.rows.find((r) => r.id === rowId);
    if (!row?.modelOutput) return;

    for (const id of selectedEvalIds) {
      const evaluator = evaluators.find((e) => e.id.toString() === id);
      if (!evaluator) continue;

      try {
        const resp = await fetcher.post(`/evaluations/evaluate`, {
          arg: {
            input: targetPV.content,
            output: { role: "assistant", content: row.modelOutput },
            evaluatorType: evaluator.id,
          },
        });
        dispatch({
          type: "SET_EVAL_RESULT",
          rowId,
          id,
          passed: resp.passed as boolean,
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleEvaluator = (ev: Evaluator) => {
    setSelectedEvalIds((prev) => {
      const id = ev.id.toString();
      if (prev.includes(id)) {
        // Deselect
        const next = prev.filter((x) => x !== id);
        setActiveEvalId(next[next.length - 1]); // show previous or nothing
        return next;
      }
      // Select
      if (!paramsMap[id]) {
        setParamsMap((m) => ({ ...m, [id]: buildInitialParams(ev) }));
      }
      setActiveEvalId(id); // new one becomes active
      return [...prev, id];
    });
  };

  const evaluatorCategories = Array.from(
    new Set(evaluators.map((e) => e.category)),
  )
    .sort((a, b) => {
      const order: Record<string, number> = {
        labeler: 0,
        "text-similarity": 1,
        custom: 2,
      };
      const rankA = order[a] ?? 100;
      const rankB = order[b] ?? 100;
      return rankA !== rankB ? rankA - rankB : a.localeCompare(b);
    })
    .map((cat) => {
      if (cat === "labeler") return { name: "Model Labeler", value: "labeler" };
      if (cat === "text-similarity")
        return { name: "Text Similarity", value: "text-similarity" };
      return { name: "Custom", value: "custom" };
    });

  const anyPrompt = state.promptVersion != null;

  return (
    <>
      <Group justify="space-between" mb="sm">
        <Title order={3}>Experiments</Title>
        <Group>
          <Switch
            size="sm"
            label="Show Prompt"
            checked={showPrompt}
            onChange={(e) => setShowPrompt(e.currentTarget.checked)}
            mr="sm"
          />
          <Button
            size="sm"
            onClick={() => setShowEvalModal(true)}
            variant="outline"
            leftSection={<IconSettings width="16" />}
          >
            Configure Evaluators
          </Button>
          <Button
            leftSection={<IconBolt size={16} />}
            size="sm"
            disabled={!anyPrompt}
            onClick={runAll}
            rightSection={<HotkeysInfo hot="Enter" size="sm" />}
          >
            Run all
          </Button>
        </Group>
      </Group>

      {/* Evaluator selector & config modal */}
      <Modal
        opened={showEvalModal}
        onClose={() => setShowEvalModal(false)}
        size="xl"
        styles={{ content: { backgroundColor: "rgb(252, 252, 252)" } }}
      >
        <Stack>
          <Title order={6}>Evaluators</Title>

          {/* Card grid */}
          <Tabs
            defaultValue={evaluatorCategories[0].value}
            onChange={() => setActiveEvalId(undefined)}
          >
            <Tabs.List>
              {evaluatorCategories.map((cat) => (
                <Tabs.Tab key={cat.value} value={cat.value}>
                  {cat.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            {evaluatorCategories.map((cat) => (
              <Tabs.Panel key={cat.value} value={cat.value} pt="md">
                <SimpleGrid cols={5} spacing="md">
                  {evaluators
                    .filter((e) => e.category === cat.value)
                    .map((e) => (
                      <EvaluatorCard
                        key={e.id}
                        evaluator={e}
                        isSelected={selectedEvalIds.includes(e.id.toString())}
                        onItemClick={() => toggleEvaluator(e as any)}
                      />
                    ))}
                </SimpleGrid>
              </Tabs.Panel>
            ))}
          </Tabs>

          {activeEvalId && paramsMap[activeEvalId] && (
            <Fieldset
              legend={
                evaluators.find((ev) => ev.id.toString() === activeEvalId)!
                  .name + " Configuration"
              }
              style={{ overflow: "visible" }}
            >
              {activeEvalId}
            </Fieldset>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setShowEvalModal(false)}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Table withTableBorder withColumnBorders withRowBorders>
        <Table.Thead>
          <Table.Tr>
            {vars.map((v) => (
              <Table.Th key={v}></Table.Th>
            ))}
            <Table.Th>
              <PromptVersionSelect
                promptVersion={state.promptVersion}
                setPromptVersion={(pv) =>
                  dispatch({ type: "SET_PROMPT_VERSION", promptVersion: pv })
                }
              />
            </Table.Th>
            {state.comparisons.map((c) => (
              <Table.Th key={c.id}>
                <PromptVersionSelect
                  promptVersion={c.promptVersion}
                  setPromptVersion={(pv) =>
                    dispatch({ type: "SET_COMP_PV", compId: c.id, pv })
                  }
                />
              </Table.Th>
            ))}
            <Table.Th>
              <Button
                leftSection={<IconPlus />}
                size="sm"
                variant="subtle"
                onClick={() => dispatch({ type: "ADD_COMP" })}
              >
                Add Comparison
              </Button>
            </Table.Th>
          </Table.Tr>

          {showPrompt && state.promptVersion && (
            <Table.Tr>
              {vars.map((v) => (
                <Table.Th key={v}></Table.Th>
              ))}
              <Table.Th>
                <Stack
                  mah="200"
                  style={{ whiteSpace: "pre-wrap", overflow: "scroll" }}
                >
                  {state.promptVersion.content.map((msg) => (
                    <Stack key={msg.content + msg.role} gap="0">
                      <Title order={6}>{msg.role}</Title>
                      <Text size="xs">{msg.content}</Text>
                    </Stack>
                  ))}
                </Stack>
              </Table.Th>
              {state.comparisons.map((c) => (
                <Table.Th key={c.id}>
                  {c.promptVersion?.content && (
                    <Stack
                      style={{ whiteSpace: "pre-wrap", overflow: "scroll" }}
                      mah="200px"
                    >
                      {c.promptVersion.content.map((msg) => (
                        <Stack key={msg.content + msg.role} gap="0">
                          <Title order={6}>{msg.role}</Title>
                          <Text size="xs">{msg.content}</Text>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Table.Th>
              ))}
              <Table.Th />
            </Table.Tr>
          )}

          <Table.Tr>
            {vars.map((v) => (
              <Table.Th key={v}>{`{{${v}}}`}</Table.Th>
            ))}
            <Table.Th>Model Output</Table.Th>
            {state.comparisons.map((c) => (
              <Table.Th key={c.id}>Model Output</Table.Th>
            ))}
            <Table.Th />
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {anyPrompt &&
            state.rows.map((row) => {
              const anyEvalLoading = selectedEvalIds.some(
                (id) => row.evalResults[id]?.loading,
              );
              return (
                <Table.Tr key={row.id}>
                  {/* variable editors */}
                  {vars.map((v) => (
                    <Table.Td key={v} p={0}>
                      <Textarea
                        styles={{ input: { border: 0, borderRadius: 0 } }}
                        value={row.variableValues[v]}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_VAR",
                            rowId: row.id,
                            varName: v,
                            value: e.currentTarget.value,
                          })
                        }
                      />
                    </Table.Td>
                  ))}

                  <Table.Td p={0}>
                    <Button
                      size="xs"
                      onClick={() => runModelRow(row.id)}
                      loading={row.modelLoading}
                      disabled={!anyPrompt}
                    >
                      Run
                    </Button>
                    <Button
                      ml="xs"
                      size="xs"
                      color="blue"
                      onClick={() => runEvaluators(row.id)}
                      disabled={
                        !row.modelOutput ||
                        !selectedEvalIds.length ||
                        anyEvalLoading
                      }
                    >
                      Evaluate
                    </Button>
                    {row.modelOutput && (
                      <Text size="sm" mt={8} style={{ whiteSpace: "pre-wrap" }}>
                        {row.modelOutput}
                      </Text>
                    )}
                    {selectedEvalIds.map((id) => {
                      const res = row.evalResults[id];
                      const ev = evaluators.find((e) => e.id.toString() === id);
                      return (
                        res && (
                          <Text size="sm" key={id}>
                            {ev?.id}: {res.passed ? "Pass" : "Fail"}
                          </Text>
                        )
                      );
                    })}
                  </Table.Td>

                  {/* comparison PV runs */}
                  {state.comparisons.map((c) => {
                    const comp = row.compResults[c.id] ?? {
                      modelOutput: "",
                      modelLoading: false,
                    };
                    return (
                      <Table.Td key={c.id} p={0}>
                        <Button
                          size="xs"
                          onClick={() => runModelRow(row.id, c.id)}
                          loading={comp.modelLoading}
                          disabled={!c.promptVersion}
                        >
                          Run
                        </Button>
                        {comp.modelOutput && (
                          <Text
                            size="sm"
                            mt={8}
                            style={{ whiteSpace: "pre-wrap" }}
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
                      onClick={() =>
                        dispatch({ type: "DELETE_ROW", rowId: row.id })
                      }
                    >
                      Delete
                    </Button>
                  </Table.Td>
                </Table.Tr>
              );
            })}
        </Table.Tbody>
      </Table>

      <Group mt="md">
        <Button size="sm" onClick={() => dispatch({ type: "ADD_ROW", vars })}>
          Add row
        </Button>
      </Group>
    </>
  );
}
