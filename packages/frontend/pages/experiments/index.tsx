import HotkeysInfo from "@/components/blocks/HotkeysInfo";
import { useOrg } from "@/utils/dataHooks";
import { Evaluator } from "@/utils/dataHooks/evaluators";
import { usePrompts, usePromptVersions } from "@/utils/dataHooks/prompts";
import { fetcher } from "@/utils/fetcher";

import EVALUATOR_TYPES from "@/utils/evaluators";
import {
  ActionIcon,
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
  Menu,
  Box,
  Collapse,
  Popover,
  NumberInput,
  Center,
} from "@mantine/core";
import {
  IconBolt,
  IconPlayerPlayFilled,
  IconPlus,
  IconSettings,
  IconTestPipe,
  IconDotsVertical,
  IconCopy,
  IconTrash,
  IconDownload,
  IconCheck,
  IconChevronUp,
  IconChevronDown,
  IconMaximize,
  IconPencil,
} from "@tabler/icons-react";
import { KeyboardEvent, useEffect, useMemo, useReducer, useState } from "react";
import { CheckLogic } from "shared";
import { Prompt, PromptVersion } from "shared/schemas/prompt";
import { EvaluatorCard } from "../evaluators/new";
import ModelSelect from "@/components/prompts/ModelSelect";
import { Model } from "shared";

/* ─────────────────────────────────────────────────────────────────────────── */

const PROMPT_COLUMN_WIDTH = 600; // px

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

/* ───────────────────────────── Types ─────────────────────────────────────── */

interface EvalResult {
  passed: boolean;
  loading: boolean;
}
interface CompResult {
  modelOutput: string;
  modelLoading: boolean;
  cost?: number;
  duration?: number;
  tokens?: number;
}
interface Row {
  id: number;
  variableValues: Record<string, string>;
  modelOutput: string;
  modelLoading: boolean;
  cost?: number;
  duration?: number;
  tokens?: number;
  compResults: Record<number, CompResult>;
  evalResults: Record<number, EvalResult>;
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
/* evaluator instance config */
interface EvaluatorConfig {
  instanceId: number;
  evaluator: Evaluator;
  params: CheckLogic;
}
/* metadata under each cell */
interface UsageMetadata {
  cost?: number;
  duration: number;
  tokens: number;
}

/* ───────────────────────── Reducer helpers ──────────────────────────────── */

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

/* ───────────────────────────── State actions ────────────────────────────── */

type Action =
  | { type: "SET_PROMPT_VERSION"; promptVersion?: PromptVersion }
  | { type: "INIT_ROWS"; vars: string[] }
  | { type: "ADD_ROW"; vars: string[] }
  | { type: "DELETE_ROW"; rowId: number }
  | { type: "SET_VAR"; rowId: number; varName: string; value: string }
  | { type: "SET_MODEL_LOADING"; rowId: number; compId?: number; flag: boolean }
  | {
      type: "SET_MODEL_OUTPUT";
      rowId: number;
      compId?: number;
      output: string;
      cost?: number;
      duration?: number;
      tokens?: number;
    }
  | { type: "SET_EVAL_LOADING"; rowId: number; instanceIds: number[] }
  | {
      type: "SET_EVAL_RESULT";
      rowId: number;
      instanceId: number;
      passed: boolean;
    }
  | { type: "ADD_COMP" }
  | { type: "SET_COMP_PV"; compId: number; pv?: PromptVersion }
  | { type: "DELETE_COMP"; compId: number }
  | { type: "DUPLICATE_ROW"; rowId: number };

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
          if (a.compId == null)
            return {
              ...r,
              modelOutput: a.output,
              cost: a.cost,
              duration: a.duration,
              tokens: a.tokens,
            };
          const prev = r.compResults[a.compId] ?? {
            modelOutput: "",
            modelLoading: false,
          };
          return {
            ...r,
            compResults: {
              ...r.compResults,
              [a.compId]: {
                ...prev,
                modelOutput: a.output,
                cost: a.cost,
                duration: a.duration,
                tokens: a.tokens,
              },
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
                evalResults: a.instanceIds.reduce<Record<number, EvalResult>>(
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
                  [a.instanceId]: { passed: a.passed, loading: false },
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

    case "DELETE_COMP":
      return {
        ...state,
        comparisons: state.comparisons.filter((c) => c.id !== a.compId),
      };

    case "DUPLICATE_ROW":
      const rowToDuplicate = state.rows.find((r) => r.id === a.rowId);
      if (!rowToDuplicate) return state;
      const newRow = {
        ...rowToDuplicate,
        id: state.nextRowId,
        evalResults: {},
        compResults: {},
      };
      return {
        ...state,
        rows: [...state.rows, newRow],
        nextRowId: state.nextRowId + 1,
      };

    default:
      return state;
  }
}

/* ─────────────────── Shared helper: buildPlaygroundArg ──────────────────── */
/** Consolidates per-column model config into the payload expected by /playground. */
function buildPlaygroundArg(
  pv: PromptVersion,
  cfg: { model: Model | null; temperature: number; maxTokens: number },
  variables: Record<string, string>,
) {
  const extra = {
    ...(pv.extra ?? {}),
    model: cfg.model ?? null,
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens,
  };
  return {
    modelId: extra.model, // ← server uses this field directly
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens,
    content: pv.content,
    extra, // ← full config forwarded
    variables,
  };
}

/* ────────────────────── Eval cell component ────────────────────────────── */

function EvalCell({
  output,
  evalResults,
  isComplete,
  evaluatorConfigs,
  metadata,
}: {
  output: string;
  evalResults: Record<number, EvalResult>;
  isComplete: boolean;
  evaluatorConfigs: EvaluatorConfig[];
  metadata?: UsageMetadata;
}) {
  const [open, setOpen] = useState(false);
  const total = evaluatorConfigs.length;
  const passedCount = evaluatorConfigs.filter(
    (cfg) => evalResults[cfg.instanceId]?.passed,
  ).length;

  if (!isComplete || !output) return null;

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box style={{ overflow: "auto", flex: 1 }}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {output}
        </Text>
      </Box>

      {metadata && (
        <Box p="xs">
          <Text size="xs" c="dimmed">
            {`${metadata.duration} ms | ${metadata.tokens} tokens`}
            {metadata.cost != null && ` | $${metadata.cost.toFixed(4)}`}
          </Text>
        </Box>
      )}

      <Box p="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            {passedCount === total && total > 0 && (
              <IconCheck color="green" size={16} />
            )}
            <Text size="sm">{`${passedCount}/${total} tests passed`}</Text>
          </Group>
          <ActionIcon onClick={() => setOpen((o) => !o)}>
            {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        </Group>
        <Collapse in={open}>
          {evaluatorConfigs.map((cfg) => {
            const res = evalResults[cfg.instanceId];
            return (
              <Text size="sm" key={cfg.instanceId}>
                {`${cfg.evaluator.id} (#${cfg.instanceId}): ${
                  res?.passed ? "Pass" : "Fail"
                }`}
              </Text>
            );
          })}
        </Collapse>
      </Box>
    </Box>
  );
}

/* ───────────────────────────── Main component ───────────────────────────── */

export default function Experiments() {
  const { org } = useOrg();
  usePrompts();

  const allEvaluators = Object.values(EVALUATOR_TYPES).filter((e) => {
    if (e.beta && !org?.beta) return false;
    return true;
  });

  /* Evaluator instance state */
  const [evaluatorConfigs, setEvaluatorConfigs] = useState<EvaluatorConfig[]>(
    [],
  );
  const [nextEvalInstanceId, setNextEvalInstanceId] = useState(0);

  /* Modal UI state */
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalModalPage, setEvalModalPage] = useState<"list" | "add">("list");
  const [selectedAddEvaluator, setSelectedAddEvaluator] =
    useState<Evaluator | null>(null);
  const [addEvaluatorParams, setAddEvaluatorParams] = useState<CheckLogic>();

  const [showPrompt, setShowPrompt] = useState(true);

  /* per-column model configuration */
  const [openConfigColumn, setOpenConfigColumn] = useState<string | null>();
  const [modelConfigs, setModelConfigs] = useState<
    Record<
      string,
      { model: Model | null; temperature: number; maxTokens: number }
    >
  >({
    base: { model: null, temperature: 1, maxTokens: 256 },
  });

  /* Variable / prompt state */
  const [state, dispatch] = useReducer(reducer, {
    promptVersion: undefined,
    rows: [],
    nextRowId: 0,
    comparisons: [],
    nextCompId: 0,
  });

  /* variable / prompt modals */
  const [variableModal, setVariableModal] = useState<{
    rowId: number;
    varName: string;
  } | null>(null);
  const [promptContentModal, setPromptContentModal] = useState<{
    compId?: number;
  } | null>(null);

  const vars = useMemo(
    () => extractVariables(JSON.stringify(state.promptVersion?.content ?? "")),
    [state],
  );

  /* ───────────────────────── hotkeys ────────────────────────── */

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

  /* ────────────────────────── Model runners ───────────────────────── */

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
      const key = compId == null ? "base" : compId.toString();
      console.log(modelConfigs);
      const cfg = modelConfigs[key] || {
        model: null,
        temperature: 1,
        maxTokens: 256,
      };

      const start = Date.now();
      const resp = await fetcher.post(`/orgs/${org?.id}/playground`, {
        arg: buildPlaygroundArg(targetPV, cfg, row.variableValues),
      });

      const duration = Date.now() - start;
      const tokens = resp.usage?.completion_tokens ?? 0;
      const cost = tokens * 0.00002;
      const output = resp.choices[0].message.content as string;

      dispatch({
        type: "SET_MODEL_OUTPUT",
        rowId,
        compId,
        output,
        cost,
        duration,
        tokens,
      });
    } catch (err) {
      console.error(err);
    } finally {
      dispatch({ type: "SET_MODEL_LOADING", rowId, compId, flag: false });
    }
  };

  // Helper used by runAll()
  async function fetchModelResult(rowId: number, compId?: number) {
    const targetPV =
      compId == null
        ? state.promptVersion
        : state.comparisons.find((c) => c.id === compId)?.promptVersion;
    if (!targetPV) throw new Error("No prompt version");

    const row = state.rows.find((r) => r.id === rowId);
    if (!row) throw new Error("Row not found");

    const key = compId == null ? "base" : compId.toString();
    const cfg = modelConfigs[key] || {
      model: null,
      temperature: 1,
      maxTokens: 256,
    };

    const start = Date.now();
    const resp = await fetcher.post(`/orgs/${org?.id}/playground`, {
      arg: buildPlaygroundArg(targetPV, cfg, row.variableValues),
    });
    const duration = Date.now() - start;
    const tokens = resp.usage?.completion_tokens ?? 0;
    const cost = tokens * 0.00002;
    return {
      rowId,
      compId,
      output: resp.choices[0].message.content as string,
      duration,
      tokens,
      cost,
    };
  }

  /* ────────────────────── Run everything at once ───────────────────── */

  async function runAll() {
    const rows = state.rows;
    const comps = state.comparisons;
    const evalInstanceIds = evaluatorConfigs.map((c) => c.instanceId);

    // Mark loading
    rows.forEach((r) => {
      dispatch({ type: "SET_MODEL_LOADING", rowId: r.id, flag: true });
      if (evalInstanceIds.length)
        dispatch({
          type: "SET_EVAL_LOADING",
          rowId: r.id,
          instanceIds: evalInstanceIds,
        });
      comps.forEach((c) =>
        dispatch({
          type: "SET_MODEL_LOADING",
          rowId: r.id,
          compId: c.id,
          flag: true,
        }),
      );
    });

    // Gather tasks
    const tasks = rows.flatMap((r) => {
      const baseTask = (async () => {
        const { rowId, output, duration, tokens, cost } =
          await fetchModelResult(r.id);
        const evals = await Promise.all(
          evaluatorConfigs.map(async (cfg) => {
            const resp = await fetcher.post(`/evaluations/evaluate`, {
              arg: {
                input: state.promptVersion?.content,
                output: { role: "assistant", content: output },
                evaluatorType: cfg.evaluator.id,
                params: cfg.params.params,
              },
            });
            return {
              instanceId: cfg.instanceId,
              passed: resp.passed as boolean,
            };
          }),
        );
        return {
          rowId,
          compId: undefined,
          output,
          evals,
          duration,
          tokens,
          cost,
        };
      })();

      const compTasks = comps.map((c) =>
        (async () => {
          const { rowId, compId, output, duration, tokens, cost } =
            await fetchModelResult(r.id, c.id);
          const targetPV = state.comparisons.find(
            (x) => x.id === c.id,
          )?.promptVersion;
          const evals = await Promise.all(
            evaluatorConfigs.map(async (cfg) => {
              const resp = await fetcher.post(`/evaluations/evaluate`, {
                arg: {
                  input: targetPV?.content,
                  output: { role: "assistant", content: output },
                  evaluatorType: cfg.evaluator.id,
                  params: cfg.params.params,
                },
              });
              return {
                instanceId: cfg.instanceId,
                passed: resp.passed as boolean,
              };
            }),
          );
          return {
            rowId,
            compId,
            output,
            evals,
            duration,
            tokens,
            cost,
          };
        })(),
      );
      return [baseTask, ...compTasks];
    });

    const results = await Promise.all(tasks);

    results.forEach(
      ({ rowId, compId, output, evals, duration, tokens, cost }) => {
        dispatch({
          type: "SET_MODEL_OUTPUT",
          rowId,
          compId,
          output,
          duration,
          tokens,
          cost,
        });
        dispatch({ type: "SET_MODEL_LOADING", rowId, compId, flag: false });
        evals.forEach(({ instanceId, passed }) => {
          dispatch({ type: "SET_EVAL_RESULT", rowId, instanceId, passed });
        });
      },
    );
  }

  /* ────────────────────── Run evaluators for a row ─────────────────── */

  const runEvaluators = async (rowId: number, compId?: number) => {
    if (!evaluatorConfigs.length) return;
    const instanceIds = evaluatorConfigs.map((c) => c.instanceId);
    dispatch({ type: "SET_EVAL_LOADING", rowId, instanceIds });

    const targetPV =
      compId == null
        ? state.promptVersion
        : state.comparisons.find((c) => c.id === compId)?.promptVersion;
    if (!targetPV) return;

    const row = state.rows.find((r) => r.id === rowId);
    const modelOutput =
      compId == null ? row?.modelOutput : row?.compResults[compId]?.modelOutput;
    if (!modelOutput) return;

    for (const cfg of evaluatorConfigs) {
      try {
        const resp = await fetcher.post(`/evaluations/evaluate`, {
          arg: {
            input: targetPV.content,
            output: { role: "assistant", content: modelOutput },
            evaluatorType: cfg.evaluator.id,
            params: cfg.params.params,
          },
        });
        dispatch({
          type: "SET_EVAL_RESULT",
          rowId,
          instanceId: cfg.instanceId,
          passed: resp.passed as boolean,
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  /* ────────────────────── Export CSV helper ────────────────────────── */

  const exportToCsv = (): void => {
    const header = [
      ...vars,
      "Model Output",
      ...state.comparisons.map(() => "Model Output"),
    ];
    const rows = state.rows.map((row) => {
      const values = [
        ...vars.map((v) => `"${row.variableValues[v] || ""}"`),
        `"${row.modelOutput}"`,
        ...state.comparisons.map((c) => {
          const comp = row.compResults[c.id]?.modelOutput || "";
          return `"${comp}"`;
        }),
      ];
      return values.join(",");
    });
    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "export.csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ──────────────────────── Evaluator categories ───────────────────── */

  const evaluatorCategories = Array.from(
    new Set(allEvaluators.map((e) => e.category)),
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

  /* ─────────────────────── Render begins here ─────────────────────── */
  return (
    <>
      {/* ───────── Top bar ───────── */}
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
            onClick={() => {
              setEvalModalPage("list");
              setShowEvalModal(true);
            }}
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

      {/* ───────── Evaluator modal ───────── */}
      <Modal
        opened={showEvalModal}
        onClose={() => setShowEvalModal(false)}
        size="xl"
        styles={{ content: { backgroundColor: "rgb(252, 252, 252)" } }}
      >
        {evalModalPage === "list" && (
          <Stack>
            <Title order={6}>Configured Evaluators</Title>

            {evaluatorConfigs.length === 0 && (
              <Center>
                <Text c="dimmed">No evaluators configured yet.</Text>
              </Center>
            )}

            {evaluatorConfigs.length > 0 && (
              <SimpleGrid cols={3}>
                {evaluatorConfigs.map((cfg) => (
                  <Box
                    key={cfg.instanceId}
                    style={{
                      position: "relative",
                      border: "1px solid #e2e2e2",
                      borderRadius: 6,
                      padding: 8,
                    }}
                  >
                    {/* Re-use EvaluatorCard just for display */}
                    <EvaluatorCard
                      evaluator={cfg.evaluator}
                      isSelected={false}
                      onItemClick={() => {}}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      style={{ position: "absolute", top: 4, right: 4 }}
                      onClick={() =>
                        setEvaluatorConfigs((prev) =>
                          prev.filter((c) => c.instanceId !== cfg.instanceId),
                        )
                      }
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Box>
                ))}
              </SimpleGrid>
            )}

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setShowEvalModal(false)}>
                Close
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setSelectedAddEvaluator(null);
                  setAddEvaluatorParams(undefined);
                  setEvalModalPage("add");
                }}
              >
                Add Evaluator
              </Button>
            </Group>
          </Stack>
        )}

        {evalModalPage === "add" && (
          <Stack>
            <Title order={6}>Add Evaluator</Title>
            <Tabs
              defaultValue={evaluatorCategories[0]?.value}
              value={
                selectedAddEvaluator
                  ? selectedAddEvaluator.category
                  : evaluatorCategories[0]?.value
              }
              onTabChange={() => setSelectedAddEvaluator(null)}
            >
              <Tabs.List>
                {evaluatorCategories.map((cat) => (
                  <Tabs.Tab key={cat.value} value={cat.value}>
                    {cat.name}
                  </Tabs.Tab>
                ))}
              </Tabs.List>

              {evaluatorCategories.map((cat) => (
                <Tabs.Panel key={cat.value} value={cat.value} pt="sm">
                  <SimpleGrid cols={3}>
                    {allEvaluators
                      .filter((e) => e.category === cat.value)
                      .map((ev) => (
                        <EvaluatorCard
                          key={ev.id}
                          evaluator={ev}
                          isSelected={selectedAddEvaluator?.id === ev.id}
                          onItemClick={() => {
                            setSelectedAddEvaluator(ev);
                            setAddEvaluatorParams(buildInitialParams(ev));
                          }}
                        />
                      ))}
                  </SimpleGrid>
                </Tabs.Panel>
              ))}
            </Tabs>

            {selectedAddEvaluator && (
              <Fieldset legend="Evaluator Configuration">
                {/* TODO: custom param editing UI. */}
                <Text size="sm" c="dimmed">
                  Parameters will use defaults. Extend here if needed.
                </Text>
              </Fieldset>
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  setEvalModalPage("list");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedAddEvaluator}
                onClick={() => {
                  if (!selectedAddEvaluator) return;
                  setEvaluatorConfigs((prev) => [
                    ...prev,
                    {
                      instanceId: nextEvalInstanceId,
                      evaluator: selectedAddEvaluator,
                      params:
                        addEvaluatorParams ??
                        buildInitialParams(selectedAddEvaluator),
                    },
                  ]);
                  setNextEvalInstanceId((n) => n + 1);
                  setEvalModalPage("list");
                }}
              >
                Add
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* ───────── Table header ───────── */}
      <Table withTableBorder withColumnBorders withRowBorders>
        <Table.Thead>
          <Table.Tr>
            {vars.map((v) => (
              <Table.Th key={v}></Table.Th>
            ))}
            <Table.Th style={{ width: `${PROMPT_COLUMN_WIDTH}px` }}>
              <Group align="center" gap="xs">
                <PromptVersionSelect
                  promptVersion={state.promptVersion}
                  setPromptVersion={(pv) =>
                    dispatch({ type: "SET_PROMPT_VERSION", promptVersion: pv })
                  }
                />
                <Popover
                  opened={openConfigColumn === "base"}
                  closeOnClickOutside={true}
                  onClose={() => setOpenConfigColumn(null)}
                  position="bottom"
                  withArrow
                >
                  <Popover.Target>
                    <ActionIcon
                      size="sm"
                      onClick={() =>
                        setOpenConfigColumn(
                          openConfigColumn === "base" ? null : "base",
                        )
                      }
                    >
                      <IconSettings size={16} />
                    </ActionIcon>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack gap="sm">
                      <ModelSelect
                        handleChange={(m) => {
                          console.log(m);

                          setModelConfigs((prev) => ({
                            ...prev,
                            base: { ...prev.base, model: m },
                          }));
                        }}
                      />
                      <NumberInput
                        label="Temperature"
                        min={0}
                        max={1}
                        step={0.01}
                        value={modelConfigs["base"].temperature}
                        onChange={(value: number) =>
                          setModelConfigs((prev) => ({
                            ...prev,
                            base: { ...prev.base, temperature: value },
                          }))
                        }
                      />
                      <NumberInput
                        label="Max Tokens"
                        min={1}
                        step={1}
                        value={modelConfigs["base"].maxTokens}
                        onChange={(value: number) =>
                          setModelConfigs((prev) => ({
                            ...prev,
                            base: { ...prev.base, maxTokens: value },
                          }))
                        }
                      />
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              </Group>
            </Table.Th>
            {state.comparisons.map((c, idx) => {
              const isLast = idx === state.comparisons.length - 1;
              return (
                <Table.Th
                  key={c.id}
                  style={{ width: `${PROMPT_COLUMN_WIDTH}px` }}
                >
                  <Group align="center" gap="xs">
                    <PromptVersionSelect
                      promptVersion={c.promptVersion}
                      setPromptVersion={(pv) =>
                        dispatch({ type: "SET_COMP_PV", compId: c.id, pv })
                      }
                    />
                    <Popover
                      opened={openConfigColumn === c.id.toString()}
                      closeOnClickOutside
                      onClose={() => setOpenConfigColumn(null)}
                      position="bottom"
                      withArrow
                    >
                      <Popover.Target>
                        <ActionIcon
                          size="sm"
                          onClick={() =>
                            setOpenConfigColumn(
                              openConfigColumn === c.id.toString()
                                ? null
                                : c.id.toString(),
                            )
                          }
                        >
                          <IconSettings size={16} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Stack gap="sm">
                          <ModelSelect
                            handleChange={(m) =>
                              setModelConfigs((prev) => ({
                                ...prev,
                                [c.id]: {
                                  model: m,
                                  temperature: prev[c.id]?.temperature ?? 1,
                                  maxTokens: prev[c.id]?.maxTokens ?? 256,
                                },
                              }))
                            }
                          />
                          <NumberInput
                            label="Temperature"
                            min={0}
                            max={1}
                            step={0.01}
                            value={modelConfigs[c.id]?.temperature ?? 1}
                            onChange={(value: number) =>
                              setModelConfigs((prev) => ({
                                ...prev,
                                [c.id]: {
                                  ...(prev[c.id] || {
                                    model: null,
                                    maxTokens: 256,
                                  }),
                                  temperature: value,
                                },
                              }))
                            }
                          />
                          <NumberInput
                            label="Max Tokens"
                            min={1}
                            step={1}
                            value={modelConfigs[c.id]?.maxTokens ?? 256}
                            onChange={(value: number) =>
                              setModelConfigs((prev) => ({
                                ...prev,
                                [c.id]: {
                                  ...(prev[c.id] || {
                                    model: null,
                                    temperature: 1,
                                  }),
                                  maxTokens: value,
                                },
                              }))
                            }
                          />
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>
                    <Menu>
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() =>
                            dispatch({ type: "DELETE_COMP", compId: c.id })
                          }
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                    {isLast && (
                      <ActionIcon
                        size="xs"
                        onClick={() => setPromptContentModal({ compId: c.id })}
                      >
                        <IconPencil size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Th>
              );
            })}
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

          {/* ───────── Row showing prompt content ───────── */}
          {showPrompt && state.promptVersion && (
            <Table.Tr>
              {vars.map((v) => (
                <Table.Th key={v}></Table.Th>
              ))}
              <Table.Th style={{ width: `${PROMPT_COLUMN_WIDTH}px` }}>
                <Stack
                  mah="200"
                  style={{ whiteSpace: "pre-wrap", overflow: "scroll" }}
                >
                  {state.promptVersion.content.map((msg) => (
                    <Stack key={msg.content + msg.role} gap="0">
                      <Title order={6}>{msg.role}</Title>
                      <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
                        {msg.content
                          .split(/({{\s*[A-Za-z_]\w*\s*}})/g)
                          .map((part, idx) =>
                            /{{\s*([A-Za-z_]\w*)\s*}}/.test(part) ? (
                              <Text component="span" key={idx} color="blue">
                                {part}
                              </Text>
                            ) : (
                              <Text component="span" key={idx}>
                                {part}
                              </Text>
                            ),
                          )}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              </Table.Th>
              {state.comparisons.map((c) => (
                <Table.Th
                  key={c.id}
                  style={{ width: `${PROMPT_COLUMN_WIDTH}px` }}
                >
                  {c.promptVersion?.content && (
                    <Stack
                      style={{ whiteSpace: "pre-wrap", overflow: "scroll" }}
                      mah="200px"
                    >
                      {c.promptVersion.content.map((msg) => (
                        <Stack key={msg.content + msg.role} gap="0">
                          <Title order={6}>{msg.role}</Title>
                          <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
                            {msg.content
                              .split(/({{\s*[A-Za-z_]\w*\s*}})/g)
                              .map((part, idx) =>
                                /{{\s*([A-Za-z_]\w*)\s*}}/.test(part) ? (
                                  <Text component="span" key={idx} color="blue">
                                    {part}
                                  </Text>
                                ) : (
                                  <Text component="span" key={idx}>
                                    {part}
                                  </Text>
                                ),
                              )}
                          </Text>
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

        {/* ───────── Table body ───────── */}
        <Table.Tbody>
          {anyPrompt &&
            state.rows.map((row) => {
              const anyEvalLoading = evaluatorConfigs.some(
                (cfg) => row.evalResults[cfg.instanceId]?.loading,
              );
              const allEvalComplete =
                evaluatorConfigs.length === 0 ||
                evaluatorConfigs.every(
                  (cfg) =>
                    row.evalResults[cfg.instanceId] &&
                    !row.evalResults[cfg.instanceId].loading,
                );

              return (
                <Table.Tr key={row.id}>
                  {/* variable editors */}
                  {vars.map((v) => (
                    <Table.Td key={v} p={0}>
                      <Group noWrap spacing={4} align="center">
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
                        <ActionIcon
                          size="xs"
                          onClick={() =>
                            setVariableModal({ rowId: row.id, varName: v })
                          }
                        >
                          <IconMaximize size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  ))}

                  {/* base prompt run */}
                  <Table.Td p={0}>
                    <Group mt="xs" ml="xs">
                      <ActionIcon
                        size="md"
                        onClick={() => runModelRow(row.id)}
                        loading={row.modelLoading}
                        disabled={!anyPrompt}
                        variant="subtle"
                      >
                        <IconPlayerPlayFilled size={16} />
                      </ActionIcon>
                      <ActionIcon
                        ml="xs"
                        size="md"
                        color="blue"
                        variant="subtle"
                        onClick={() => runEvaluators(row.id)}
                        disabled={
                          !row.modelOutput ||
                          !evaluatorConfigs.length ||
                          anyEvalLoading
                        }
                      >
                        <IconTestPipe size={16} />
                      </ActionIcon>
                    </Group>
                    {allEvalComplete && row.modelOutput && (
                      <EvalCell
                        output={row.modelOutput}
                        evalResults={row.evalResults}
                        isComplete={allEvalComplete}
                        evaluatorConfigs={evaluatorConfigs}
                        metadata={{
                          duration: row.duration!,
                          tokens: row.tokens!,
                          cost: row.cost,
                        }}
                      />
                    )}
                  </Table.Td>

                  {/* comparison prompt runs */}
                  {state.comparisons.map((c) => {
                    const comp = row.compResults[c.id] ?? {
                      modelOutput: "",
                      modelLoading: false,
                    };
                    return (
                      <Table.Td key={c.id} p={0}>
                        <Group mt="xs" ml="xs">
                          <ActionIcon
                            size="md"
                            variant="subtle"
                            onClick={() => runModelRow(row.id, c.id)}
                            loading={comp.modelLoading}
                            disabled={!c.promptVersion}
                          >
                            <IconPlayerPlayFilled size={16} />
                          </ActionIcon>
                          <ActionIcon
                            ml="xs"
                            size="md"
                            color="blue"
                            variant="subtle"
                            onClick={() => runEvaluators(row.id, c.id)}
                            disabled={
                              !comp.modelOutput ||
                              !evaluatorConfigs.length ||
                              anyEvalLoading
                            }
                          >
                            <IconTestPipe size={16} />
                          </ActionIcon>
                        </Group>

                        {allEvalComplete && comp.modelOutput && (
                          <EvalCell
                            output={comp.modelOutput}
                            evalResults={row.evalResults}
                            isComplete={allEvalComplete}
                            evaluatorConfigs={evaluatorConfigs}
                            metadata={{
                              duration: comp.duration!,
                              tokens: comp.tokens!,
                              cost: comp.cost,
                            }}
                          />
                        )}
                      </Table.Td>
                    );
                  })}

                  <Table.Td>
                    <Menu>
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconCopy size={14} />}
                          onClick={() =>
                            dispatch({ type: "DUPLICATE_ROW", rowId: row.id })
                          }
                        >
                          Duplicate
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() =>
                            dispatch({ type: "DELETE_ROW", rowId: row.id })
                          }
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              );
            })}
        </Table.Tbody>
      </Table>

      {/* ───────── Table footer buttons ───────── */}
      <Group mt="md">
        <Button
          leftSection={<IconPlus width={16} />}
          variant="outline"
          size="xs"
          onClick={() => dispatch({ type: "ADD_ROW", vars })}
        >
          Add row
        </Button>
        <Button
          leftSection={<IconDownload size={16} />}
          variant="outline"
          size="xs"
          onClick={exportToCsv}
        >
          Export CSV
        </Button>
      </Group>

      {/* ───────── Variable edit modal ───────── */}
      {variableModal && (
        <Modal
          opened
          onClose={() => setVariableModal(null)}
          title={`Edit variable ${variableModal.varName}`}
        >
          <Textarea
            autosize
            minRows={4}
            value={
              state.rows.find((r) => r.id === variableModal.rowId)
                ?.variableValues[variableModal.varName] || ""
            }
            onChange={(e) =>
              dispatch({
                type: "SET_VAR",
                rowId: variableModal.rowId,
                varName: variableModal.varName,
                value: e.currentTarget.value,
              })
            }
          />
          <Group position="right" mt="md">
            <Button onClick={() => setVariableModal(null)}>Close</Button>
          </Group>
        </Modal>
      )}

      {/* ───────── Prompt content edit modal ───────── */}
      {promptContentModal && (
        <Modal
          opened
          onClose={() => setPromptContentModal(null)}
          title="Edit prompt content"
          size="lg"
        >
          <Stack>
            {(promptContentModal.compId != null
              ? state.comparisons.find(
                  (c) => c.id === promptContentModal.compId,
                )?.promptVersion?.content
              : state.promptVersion?.content || []
            ).map((msg, i) => (
              <div key={i}>
                <Text size="sm" weight={500}>{`role: ${msg.role}`}</Text>
                <Textarea
                  autosize
                  minRows={2}
                  value={msg.content || ""}
                  onChange={(e) => {
                    const compId = promptContentModal.compId;
                    const currentPV =
                      compId == null
                        ? state.promptVersion
                        : state.comparisons.find((c) => c.id === compId)
                            ?.promptVersion;
                    if (!currentPV) return;
                    const newContent = currentPV.content.map((m, idx) =>
                      idx === i ? { ...m, content: e.currentTarget.value } : m,
                    );
                    const updatedPV = { ...currentPV, content: newContent };
                    if (compId == null)
                      dispatch({
                        type: "SET_PROMPT_VERSION",
                        promptVersion: updatedPV,
                      });
                    else
                      dispatch({
                        type: "SET_COMP_PV",
                        compId,
                        pv: updatedPV,
                      });
                  }}
                />
              </div>
            ))}
            <Group position="right" mt="md">
              <Button onClick={() => setPromptContentModal(null)}>Close</Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </>
  );
}

/* ────────────────────────── PromptVersionSelect ─────────────────────────── */

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
        w={promptVersion ? 70 : 150}
        styles={{ input: { borderRadius: "0 8px 8px 0", borderLeft: 0 } }}
        comboboxProps={{ width: 80 }}
      />
    </Group>
  );
}
