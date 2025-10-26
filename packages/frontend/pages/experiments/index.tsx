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
  Text,
  TextInput,
  Textarea,
  Title,
  Menu,
  Box,
  Collapse,
  Popover,
  NumberInput,
  Center,
  Divider,
  Accordion,
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
  IconCirclePlus,
  IconX,
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

const DEFAULT_TEXT_SIMILARITY_METHOD = "cosine";

const buildInitialParams = (evaluator: any): CheckLogic => {
  switch (evaluator.id) {
    case "model-labeler":
      return {
        id: "model-labeler",
        params: {
          modelId: "",
          prompt: "",
          labels: [""],
        },
      };
    case "model-scorer":
      return {
        id: "model-scorer",
        params: {
          modelId: "",
          prompt: "",
          minScore: 0,
          maxScore: 10,
        },
      };
    case "text-similarity":
      return {
        id: "text-similarity",
        params: {
          method: DEFAULT_TEXT_SIMILARITY_METHOD,
          reference: "",
          threshold: 0.5,
        },
      };
    case "llm":
      return {
        id: "llm",
        params: {
          modelId: "",
          scoringType: "boolean",
          prompt: "",
          categories: [],
        },
      };
    default: {
      const init = (evaluator.params as any[]).reduce<Record<string, any>>(
        (acc, p) => {
          if ("id" in p) acc[p.id] = p.defaultValue;
          return acc;
        },
        {},
      );
      return { id: evaluator.id, params: init };
    }
  }
};

/* ───────────────────────────── Types ─────────────────────────────────────── */

interface EvalResult {
  passed?: boolean;
  loading: boolean;
  result?: any;
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
      passed?: boolean;
      result?: any;
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
                    [id]: { passed: undefined, loading: true },
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
                  [a.instanceId]: {
                    passed: a.passed,
                    result: a.result,
                    loading: false,
                  },
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
  const passTrackedConfigs = evaluatorConfigs.filter(
    (cfg) => typeof evalResults[cfg.instanceId]?.passed === "boolean",
  );
  const passedCount = passTrackedConfigs.filter(
    (cfg) => evalResults[cfg.instanceId]?.passed,
  ).length;
  const hasPassMetrics = passTrackedConfigs.length > 0;

  const formatEvaluatorResult = (
    cfg: EvaluatorConfig,
    res?: EvalResult,
  ): string => {
    if (!res || res.loading) return "Pending";
    if (typeof res.passed === "boolean") {
      return res.passed ? "✅ Pass" : "❌ Fail";
    }

    const data = res.result;
    if (!data || typeof data !== "object") return "—";

    if (typeof (data as any).score === "number") {
      const score = Number((data as any).score).toFixed(2);
      if (typeof (data as any).method === "string") {
        return `${String((data as any).method).toUpperCase()} score: ${score}`;
      }
      return `Score: ${score}`;
    }

    if (typeof (data as any).primaryLabel === "string") {
      return `Label: ${(data as any).primaryLabel}`;
    }

    if (Array.isArray((data as any).matches) && (data as any).matches.length) {
      return `Matches: ${(data as any).matches.join(", ")}`;
    }

    return "—";
  };

  if (!isComplete || !output) return null;

  return (
    <Box
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
      mt="sm"
    >
      <Box style={{ overflow: "auto", flex: 1 }} p="xs">
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {output}
        </Text>
      </Box>

      <Divider my="sm" />

      {metadata && (
        <Box p="sm">
          <Text size="xs" c="dimmed">
            {`${metadata.duration} ms | ${metadata.tokens} tokens`}
            {metadata.cost != null && ` | $${metadata.cost.toFixed(4)}`}
          </Text>
        </Box>
      )}

      {total > 0 && (
        <Box p="sm">
          <Accordion
            variant="separated"
            style={{
              border: "1px solid var(--matine-color-gray-3)",
              borderRadius: 6,
            }}
          >
            <Accordion.Item value={"evals"}>
              <Accordion.Control>
                <Group gap="xs">
                  {hasPassMetrics &&
                    passedCount === passTrackedConfigs.length &&
                    passTrackedConfigs.length > 0 && (
                      <IconCheck color="green" size={16} />
                  )}
                  <Text size="sm">
                    {hasPassMetrics
                      ? `${passedCount}/${passTrackedConfigs.length} tests passed`
                      : "Evaluator results"}
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {evaluatorConfigs.map((cfg) => {
                  const res = evalResults[cfg.instanceId];
                  return (
                    <Text size="sm" key={cfg.instanceId}>
                      {`${formatEvaluatorResult(cfg, res)} – ${cfg.evaluator.name}`}
                    </Text>
                  );
                })}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
      )}
    </Box>
  );
}

/* ───────────────────────────── Main component ───────────────────────────── */

export default function Experiments() {
  const { org } = useOrg();
  usePrompts();

  const allEvaluators = Object.values(EVALUATOR_TYPES).filter((e) => {
    if (e.beta && !org?.beta) return false;
    if (e.builtin) return false;
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
              passed:
                typeof resp.passed === "boolean" ? (resp.passed as boolean) : undefined,
              result: resp,
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
                passed:
                  typeof resp.passed === "boolean"
                    ? (resp.passed as boolean)
                    : undefined,
                result: resp,
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
        evals.forEach(({ instanceId, passed, result }) => {
          dispatch({
            type: "SET_EVAL_RESULT",
            rowId,
            instanceId,
            passed,
            result,
          });
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
          passed:
            typeof resp.passed === "boolean"
              ? (resp.passed as boolean)
              : undefined,
          result: resp,
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

  const sortedEvaluators = [...allEvaluators].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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
            Test Cases
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
        styles={{ root: { backgroundColor: "rgb(252, 252, 252)" } }}
        title="Test cases"
      >
        {evalModalPage === "list" && (
          <Stack>
            {evaluatorConfigs.length === 0 && (
              <Center>
                <Text c="dimmed">No test cases configured</Text>
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
                    <EvaluatorCard
                      evaluator={cfg.evaluator}
                      isSelected={false}
                      onItemClick={() => {}}
                      hideAddIcon={true}
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

            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => {
                  setSelectedAddEvaluator(null);
                  setAddEvaluatorParams(undefined);
                  setEvalModalPage("add");
                }}
              >
                Save
              </Button>
            </Group>
          </Stack>
        )}

        {evalModalPage === "add" && (
          <Stack>
            <SimpleGrid cols={3}>
              {sortedEvaluators.map((ev) => (
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

            {selectedAddEvaluator &&
              ["model-labeler", "model-scorer", "text-similarity"].includes(
                selectedAddEvaluator.id,
              ) && (
              <Fieldset legend="Evaluator Configuration">
                {selectedAddEvaluator.id === "model-labeler" && (
                  <Stack gap="sm">
                    <Textarea
                      label="Prompt"
                      autosize
                      minRows={3}
                      value={addEvaluatorParams?.params.prompt || ""}
                      onChange={(e) =>
                        setAddEvaluatorParams((prev) => ({
                          ...(prev ?? { id: "model-labeler", params: {} }),
                          params: {
                            ...(prev?.params ?? {}),
                            prompt: e.currentTarget.value,
                          },
                        }))
                      }
                    />
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>
                        Labels
                      </Text>
                      {(addEvaluatorParams?.params.labels ?? [""]).map(
                        (label: string, idx: number) => (
                          <Group key={idx} align="center" gap="xs">
                            <TextInput
                              placeholder="Label name"
                              value={label}
                              onChange={(e) => {
                                const labels = [
                                  ...(addEvaluatorParams?.params.labels ?? []),
                                ];
                                labels[idx] = e.currentTarget.value;
                                setAddEvaluatorParams((prev) => ({
                                  ...(prev ?? {
                                    id: "model-labeler",
                                    params: {},
                                  }),
                                  params: {
                                    ...(prev?.params ?? {}),
                                    labels,
                                  },
                                }));
                              }}
                            />
                            <Button
                              variant="subtle"
                              onClick={() => {
                                const labels = (
                                  addEvaluatorParams?.params.labels ?? []
                                ).filter((_, i) => i !== idx);
                                setAddEvaluatorParams((prev) => ({
                                  ...(prev ?? {
                                    id: "model-labeler",
                                    params: {},
                                  }),
                                  params: {
                                    ...(prev?.params ?? {}),
                                    labels,
                                  },
                                }));
                              }}
                            >
                              <IconX size={14} />
                            </Button>
                          </Group>
                        ),
                      )}
                      <Button
                        variant="light"
                        leftSection={<IconCirclePlus size={14} />}
                        onClick={() => {
                          const labels = [
                            ...(addEvaluatorParams?.params.labels ?? []),
                            "",
                          ];
                          setAddEvaluatorParams((prev) => ({
                            ...(prev ?? { id: "model-labeler", params: {} }),
                            params: {
                              ...(prev?.params ?? {}),
                              labels,
                            },
                          }));
                        }}
                      >
                        Add label
                      </Button>
                    </Stack>
                  </Stack>
                )}

                {selectedAddEvaluator.id === "model-scorer" && (
                  <Stack gap="sm">
                    <Textarea
                      label="Prompt"
                      autosize
                      minRows={3}
                      value={addEvaluatorParams?.params.prompt || ""}
                      onChange={(e) =>
                        setAddEvaluatorParams((prev) => ({
                          ...(prev ?? { id: "model-scorer", params: {} }),
                          params: {
                            ...(prev?.params ?? {}),
                            prompt: e.currentTarget.value,
                          },
                        }))
                      }
                    />
                    <Group align="flex-end" gap="md">
                      <NumberInput
                        label="Min"
                        value={addEvaluatorParams?.params.minScore ?? 0}
                        onChange={(value) => {
                          const min = Number(value) || 0;
                          setAddEvaluatorParams((prev) => ({
                            ...(prev ?? { id: "model-scorer", params: {} }),
                            params: {
                              ...(prev?.params ?? {}),
                              minScore: min,
                              maxScore: Math.max(
                                prev?.params?.maxScore ?? 10,
                                min,
                              ),
                            },
                          }));
                        }}
                      />
                      <NumberInput
                        label="Max"
                        value={addEvaluatorParams?.params.maxScore ?? 10}
                        onChange={(value) => {
                          const max = Number(value) || 10;
                          setAddEvaluatorParams((prev) => ({
                            ...(prev ?? { id: "model-scorer", params: {} }),
                            params: {
                              ...(prev?.params ?? {}),
                              maxScore: Math.max(
                                max,
                                prev?.params?.minScore ?? 0,
                              ),
                            },
                          }));
                        }}
                      />
                    </Group>
                  </Stack>
                )}

                {selectedAddEvaluator.id === "text-similarity" && (
                  <Stack gap="sm">
                    <Select
                      label="Method"
                      data={[
                        { label: "Cosine Similarity", value: "cosine" },
                        { label: "BLEU", value: "bleu" },
                        { label: "ROUGE", value: "rouge" },
                        { label: "GLEU", value: "gleu" },
                        { label: "Fuzzy Match", value: "fuzzy" },
                      ]}
                      value={
                        addEvaluatorParams?.params.method ||
                        DEFAULT_TEXT_SIMILARITY_METHOD
                      }
                      onChange={(value) => {
                        if (!value) return;
                        setAddEvaluatorParams((prev) => ({
                          ...(prev ?? { id: "text-similarity", params: {} }),
                          params: {
                            ...(prev?.params ?? {}),
                            method: value,
                          },
                        }));
                      }}
                    />
                    <Textarea
                      label="Reference Text"
                      autosize
                      minRows={3}
                      value={addEvaluatorParams?.params.reference || ""}
                      onChange={(e) =>
                        setAddEvaluatorParams((prev) => ({
                          ...(prev ?? { id: "text-similarity", params: {} }),
                          params: {
                            ...(prev?.params ?? {}),
                            reference: e.currentTarget.value,
                          },
                        }))
                      }
                    />
                  </Stack>
                )}
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
      <Table
        withTableBorder
        withColumnBorders
        withRowBorders
        style={{ overflowY: "scroll" }}
      >
        <Table.Thead>
          <Table.Tr bg="gray.0">
            {vars.map((v) => (
              <Table.Th key={v} w="300px"></Table.Th>
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
                      radius="sm"
                      onClick={() =>
                        setOpenConfigColumn(
                          openConfigColumn === "base" ? null : "base",
                        )
                      }
                      color="gray"
                      variant="light"
                    >
                      <IconSettings size={16} />
                    </ActionIcon>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack gap="sm">
                      <ModelSelect
                        handleChange={(m) => {
                          setModelConfigs((prev) => ({
                            ...prev,
                            base: { ...prev.base, model: m },
                          }));
                        }}
                      />
                      <NumberInput
                        label="Temperature"
                        size="xs"
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
                        size="xs"
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
                <Text size="xs" c="dimmed">
                  {modelConfigs["base"].model?.name ?? "gpt-5"}
                </Text>
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
                              openConfigColumn === c.id.toString()
                                ? null
                                : c.id.toString(),
                            )
                          }
                          color="gray"
                          variant="light"
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
                            size="xs"
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
                            size="xs"
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
                        <ActionIcon variant="transparent" color="gray" c="gray">
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
                        {isLast && (
                          <Menu.Item
                            leftSection={<IconPencil size={14} />}
                            onClick={() =>
                              setPromptContentModal({ compId: c.id })
                            }
                          >
                            Edit Prompt
                          </Menu.Item>
                        )}
                      </Menu.Dropdown>
                    </Menu>
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

          {showPrompt && state.promptVersion && (
            <Table.Tr bg="gray.0">
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
                      <Group wrap="nowrap" gap={4} align="center">
                        <Textarea
                          styles={{
                            input: {
                              border: 0,
                              borderRadius: 0,
                              background: "transparent",
                            },
                          }}
                          value={row.variableValues[v]}
                          flex="1"
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
                          style={{ alignSelf: "flex-start" }}
                          size="xs"
                          variant="subtle"
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
                    <Group my="xs" ml="xs">
                      <ActionIcon
                        size="md"
                        onClick={() => runModelRow(row.id)}
                        loading={row.modelLoading}
                        disabled={!anyPrompt}
                        variant="subtle"
                      >
                        <IconPlayerPlayFilled size={16} />
                      </ActionIcon>
                      {/* <ActionIcon
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
                      </ActionIcon> */}
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
                        <Group my="xs" ml="xs">
                          <ActionIcon
                            size="md"
                            variant="subtle"
                            onClick={() => runModelRow(row.id, c.id)}
                            loading={comp.modelLoading}
                            disabled={!c.promptVersion}
                          >
                            <IconPlayerPlayFilled size={16} />
                          </ActionIcon>
                          {/* <ActionIcon
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
                          </ActionIcon> */}
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
        w={180}
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
