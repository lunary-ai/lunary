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

/* ──────────────────────── Types & table reducer ────────────────────── */

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
  | {
      type: "SET_MODEL_OUTPUT";
      rowId: number;
      compId?: number;
      output: string;
      cost?: number;
      duration?: number;
      tokens?: number;
    }
  | { type: "SET_EVAL_LOADING"; rowId: number; ids: string[] }
  | { type: "SET_EVAL_RESULT"; rowId: number; id: string; passed: boolean }
  | { type: "ADD_COMP" }
  | { type: "SET_COMP_PV"; compId: number; pv?: PromptVersion }
  | { type: "DELETE_COMP"; compId: number }
  | { type: "SET_PROMPT_VERSION"; promptVersion?: PromptVersion }
  | { type: "DUPLICATE_ROW"; rowId: number };

// define metadata type
interface UsageMetadata {
  cost?: number;
  duration: number;
  tokens: number;
}

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

// New EvalCell component to display output with collapsible evaluation results
function EvalCell({
  output,
  evalResults,
  isComplete,
  selectedEvalIds,
  evaluators,
  metadata,
}: {
  output: string;
  evalResults: Record<string, EvalResult>;
  isComplete: boolean;
  selectedEvalIds: string[];
  evaluators: any[];
  metadata?: UsageMetadata;
}) {
  const [open, setOpen] = useState(false);
  const total = selectedEvalIds.length;
  const passedCount = selectedEvalIds.filter(
    (id) => evalResults[id]?.passed,
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
            {passedCount === total && <IconCheck color="green" size={16} />}
            <Text size="sm">{`${passedCount}/${total} tests passed`}</Text>
          </Group>
          <ActionIcon onClick={() => setOpen((o) => !o)}>
            {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        </Group>
        <Collapse in={open}>
          {selectedEvalIds.map((id) => {
            const res = evalResults[id];
            const ev = evaluators.find((e) => e.id.toString() === id);
            return (
              <Text
                size="sm"
                key={id}
              >{`${ev?.id}: ${res.passed ? "Pass" : "Fail"}`}</Text>
            );
          })}
        </Collapse>
      </Box>
    </Box>
  );
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

  // per-column model configuration state
  const [openConfigColumn, setOpenConfigColumn] = useState<string | null>();
  const [modelConfigs, setModelConfigs] = useState<
    Record<
      string,
      { model: Model | null; temperature: number; maxTokens: number }
    >
  >({
    base: { model: null, temperature: 1, maxTokens: 256 },
  });

  const [state, dispatch] = useReducer(reducer, {
    promptVersion: undefined,
    rows: [],
    nextRowId: 0,
    comparisons: [],
    nextCompId: 0,
  });
  // state to track which variable cell is expanded in modal
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
    const start = Date.now();

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
      const resp = await fetcher.post(`/orgs/${org?.id}/playground`, {
        arg: {
          modelId: cfg.model?.id,
          temperature: cfg.temperature,
          maxTokens: cfg.maxTokens,
          content: targetPV.content,
          extra: targetPV.extra,
          variables: row.variableValues,
        },
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

  // fetchModelResult returns the output for a given row and optional comparison without dispatching
  async function fetchModelResult(rowId: number, compId?: number) {
    const start = Date.now();
    const targetPV =
      compId == null
        ? state.promptVersion
        : state.comparisons.find((c) => c.id === compId)?.promptVersion;
    if (!targetPV) throw new Error("No prompt version");
    const row = state.rows.find((r) => r.id === rowId);
    if (!row) throw new Error("No row found");
    const key = compId == null ? "base" : compId.toString();
    const cfg = modelConfigs[key] || {
      model: null,
      temperature: 1,
      maxTokens: 256,
    };
    const resp = await fetcher.post(`/orgs/${org?.id}/playground`, {
      arg: {
        modelId: cfg.model?.id,
        temperature: cfg.temperature,
        maxTokens: cfg.maxTokens,
        content: targetPV.content,
        extra: targetPV.extra,
        variables: row.variableValues,
      },
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

  // Run all rows and comparisons, wait for all to complete, then update cells
  async function runAll() {
    const rows = state.rows;
    const comps = state.comparisons;
    // set all loading flags
    rows.forEach((r) => {
      // base cell loading
      dispatch({ type: "SET_MODEL_LOADING", rowId: r.id, flag: true });
      if (selectedEvalIds.length)
        dispatch({
          type: "SET_EVAL_LOADING",
          rowId: r.id,
          ids: selectedEvalIds,
        });
      // comparison cells loading
      comps.forEach((c) => {
        dispatch({
          type: "SET_MODEL_LOADING",
          rowId: r.id,
          compId: c.id,
          flag: true,
        });
        if (selectedEvalIds.length)
          dispatch({
            type: "SET_EVAL_LOADING",
            rowId: r.id,
            ids: selectedEvalIds,
          });
      });
    });
    // prepare tasks for model + evaluator calls
    const tasks = rows.flatMap((r) => {
      const base = (async () => {
        const { rowId, output, duration, tokens, cost } =
          await fetchModelResult(r.id);
        const evals = await Promise.all(
          selectedEvalIds.map(async (id) => {
            const resp = await fetcher.post(`/evaluations/evaluate`, {
              arg: {
                input: state.promptVersion?.content,
                output: { role: "assistant", content: output },
                evaluatorType: id,
              },
            });
            return { id, passed: resp.passed as boolean };
          }),
        );
        return {
          rowId,
          compId: undefined as number | undefined,
          output,
          evals,
          duration,
          tokens,
          cost,
        };
      })();
      const compsTasks = comps.map((c) =>
        (async () => {
          const { rowId, compId, output, duration, tokens, cost } =
            await fetchModelResult(r.id, c.id);
          const evals = await Promise.all(
            selectedEvalIds.map(async (id) => {
              const targetPV = state.comparisons.find(
                (x) => x.id === c.id,
              )?.promptVersion;
              const resp = await fetcher.post(`/evaluations/evaluate`, {
                arg: {
                  input: targetPV?.content,
                  output: { role: "assistant", content: output },
                  evaluatorType: id,
                },
              });
              return { id, passed: resp.passed as boolean };
            }),
          );
          return {
            rowId,
            compId: c.id,
            output,
            evals,
            duration,
            tokens,
            cost,
          };
        })(),
      );
      return [base, ...compsTasks];
    });
    // wait for all
    const results = await Promise.all(tasks);
    // dispatch updates once complete
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
        evals.forEach(({ id, passed }) => {
          dispatch({ type: "SET_EVAL_RESULT", rowId, id, passed });
        });
      },
    );
  }

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

          {/* Card grid and config panels here */}
          <SimpleGrid cols={3}>
            {evaluatorCategories.map((cat) => (
              <Stack key={cat.value}>
                <Title order={6}>{cat.name}</Title>
                {evaluators
                  .filter((e) => e.category === cat.value)
                  .map((ev) => (
                    <EvaluatorCard
                      key={ev.id}
                      evaluator={ev}
                      selected={selectedEvalIds.includes(ev.id.toString())}
                      onClick={() => toggleEvaluator(ev)}
                    />
                  ))}
              </Stack>
            ))}
          </SimpleGrid>

          {activeEvalId && (
            <Fieldset
              legend="Evaluator Configuration"
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
                        handleChange={(m) =>
                          setModelConfigs((prev) => ({
                            ...prev,
                            base: { ...prev.base, model: m },
                          }))
                        }
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

        <Table.Tbody>
          {anyPrompt &&
            state.rows.map((row) => {
              const anyEvalLoading = selectedEvalIds.some(
                (id) => row.evalResults[id]?.loading,
              );
              const allEvalComplete =
                selectedEvalIds.length === 0 ||
                selectedEvalIds.every(
                  (id) => row.evalResults[id] && !row.evalResults[id].loading,
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
                          !selectedEvalIds.length ||
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
                        selectedEvalIds={selectedEvalIds}
                        evaluators={evaluators}
                        metadata={{
                          duration: row.duration!,
                          tokens: row.tokens!,
                          cost: row.cost,
                        }}
                      />
                    )}
                  </Table.Td>

                  {/* comparison PV runs */}
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
                              !row.modelOutput ||
                              !selectedEvalIds.length ||
                              anyEvalLoading
                            }
                          >
                            <IconTestPipe size={16} />
                          </ActionIcon>
                        </Group>

                        {allEvalComplete && (
                          <EvalCell
                            output={comp.modelOutput}
                            evalResults={row.evalResults}
                            isComplete={allEvalComplete}
                            selectedEvalIds={selectedEvalIds}
                            evaluators={evaluators}
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

      {/* Modal for editing variable in larger view */}
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

      {/* Modal to edit prompt content of last column */}
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
