import OpenAI from "openai";
import { z } from "zod";
import {
  CHECKS,
  serializeLogic,
  type CheckLogic,
  type CheckParam,
  type LogicElement,
  type LogicNode,
} from "shared";

import sql from "@/src/utils/db";
import baseOpenAI from "@/src/utils/openai";

const MODEL = process.env.OPENAI_FILTERS_MODEL ?? "gpt-5";

const SUPPORTED_RUN_TYPES = new Set<RunType>(["llm", "trace", "thread"]);

const NormalizedClauseSchema = z.object({
  id: z.string(),
  op: z
    .string()
    .optional()
    .transform((op) => (op ? op.toLowerCase() : undefined)),
  value: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .transform((val) =>
      typeof val === "boolean" ? (val ? "true" : "false") : val,
    ),
  range: z
    .tuple([z.coerce.number(), z.coerce.number()])
    .optional()
    .transform((r) => (r ? (r[0] <= r[1] ? r : [r[1], r[0]]) : r)),
  unit: z.enum(["seconds", "ms", "minutes", "hours", "days"]).optional(),
  field: z
    .enum(["total", "prompt", "completion", "input", "output", "any"])
    .optional(),
  values: z
    .array(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .transform((vals) =>
      vals?.map((val) =>
        typeof val === "boolean" ? (val ? "true" : "false") : String(val),
      ),
    ),
  iso: z
    .union([
      z.string(),
      z.tuple([z.string(), z.string()]).transform((arr) => [arr[0], arr[1]]),
    ])
    .optional(),
  thumbs: z
    .array(z.enum(["up", "down", "null"]))
    .optional()
    .transform((thumbs) => thumbs?.map((thumb) => thumb ?? "null")),
  key: z.string().optional(),
  flag: z.string().optional(),
});

const NormalizedGroupSchema = z.object({
  op: z.enum(["AND", "OR"]).default("AND"),
  clauses: z.array(NormalizedClauseSchema),
});

const NormalizedPlanSchema = z.object({
  op: z.enum(["AND", "OR"]).default("AND"),
  clauses: z.array(NormalizedClauseSchema).default([]),
  groups: z.array(NormalizedGroupSchema).default([]),
  unmatched: z.array(z.string()).default([]),
});

export type RunType = "llm" | "trace" | "thread";
export type NormalizedClause = z.infer<typeof NormalizedClauseSchema>;
export type NormalizedGroup = z.infer<typeof NormalizedGroupSchema>;
export type NormalizedPlan = z.infer<typeof NormalizedPlanSchema>;

const openai =
  baseOpenAI ??
  (process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null);

const numericOps = new Set(["gt", "lt", "eq", "neq", "gte", "lte"]);

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const isLabelParam = (
  param: CheckParam | { type: "label" },
): param is {
  type: "label";
} => param.type === "label";

const getRuntimeParams = (checkId: string): CheckParam[] => {
  const check = CHECKS.find((candidate) => candidate.id === checkId);
  if (!check) return [];

  return check.params.filter(
    (param): param is CheckParam => !isLabelParam(param),
  );
};

const toSeconds = (value: number, unit?: string) => {
  switch (unit) {
    case "ms":
      return value / 1000;
    case "minutes":
      return value * 60;
    case "hours":
      return value * 3600;
    case "days":
      return value * 86400;
    case "seconds":
    default:
      return value;
  }
};

const normalizeComparison = (op: NormalizedClause["op"], defaults: string) => {
  if (!op) return defaults;

  const lowered = op.toLowerCase();

  switch (lowered) {
    case "gt":
    case "greater":
    case "greater_than":
    case "greaterthan":
    case "more":
    case "over":
    case "after":
      return "gt";
    case "lt":
    case "less":
    case "less_than":
    case "lessthan":
    case "under":
    case "before":
      return "lt";
    case "eq":
    case "equals":
    case "equal":
    case "==":
      return "eq";
    case "neq":
    case "not":
    case "not_equal":
    case "notequal":
    case "!=":
      return "neq";
    case "gte":
    case "atleast":
    case "at_least":
    case "minimum":
    case ">=":
      return "gte";
    case "lte":
    case "atmost":
    case "at_most":
    case "maximum":
    case "<=":
      return "lte";
    case "between":
      return "between";
    default:
      return defaults;
  }
};

const normalizeThumbLabel = (raw?: string) => {
  if (!raw) return undefined;
  const lowered = raw.toLowerCase();

  if (lowered.includes("down") || lowered.includes("negative")) return "down";
  if (lowered.includes("up") || lowered.includes("positive")) return "up";
  if (lowered.includes("null") || lowered.includes("neutral")) return "null";
  return undefined;
};

const buildFeedbackValues = (clause: NormalizedClause) => {
  const thumbs = new Set<string>();

  clause.thumbs?.forEach((thumb) => {
    if (thumb) thumbs.add(thumb);
  });

  clause.values?.forEach((value) => {
    const normalized = normalizeThumbLabel(value);
    if (normalized) thumbs.add(normalized);
  });

  if (typeof clause.value === "string") {
    const normalized = normalizeThumbLabel(clause.value);
    if (normalized) thumbs.add(normalized);
  }

  return Array.from(thumbs).map((thumb) =>
    JSON.stringify({ thumb: thumb === "null" ? null : thumb }),
  );
};

const ensureClient = () => {
  if (!openai) {
    throw new Error(
      "OpenAI client is not configured. Set OPENAI_API_KEY to enable NL filters.",
    );
  }

  return openai;
};

type HeuristicResult = {
  plan: NormalizedPlan;
  descriptions: string[];
};

type ChatMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

async function buildFilterHints(
  projectId: string | undefined,
  runType: RunType,
): Promise<{
  text: string | null;
  models: string[];
  tags: string[];
  templates: string[];
}> {
  const lines: string[] = [];
  let availableModels: string[] = [];
  let availableTags: string[] = [];
  let availableTemplates: string[] = [];

  const formatOptions = (values: Array<{ label?: string; value: any }>) =>
    values
      .map((option) =>
        option.label && option.label !== option.value
          ? `${option.value} (${option.label})`
          : String(option.value),
      )
      .filter(Boolean)
      .slice(0, 10)
      .join(", ");

  const pushStaticSelectOptions = (checkId: string, label?: string) => {
    const check = findCheck(checkId);
    if (!check) return;
    const options = check.params
      .filter(
        (param): param is CheckParam & { options: any } =>
          (param as CheckParam).type === "select" && !!(param as any).options,
      )
      .flatMap((param) => {
        const opts = (param as any).options;
        if (!Array.isArray(opts)) return [];
        return opts.map((opt: any) => ({
          label: opt.label ?? undefined,
          value: opt.value ?? opt,
        }));
      });

    if (options.length) {
      lines.push(`${label ?? checkId}: ${formatOptions(options)}`);
    }
  };

  pushStaticSelectOptions("status", "status");
  pushStaticSelectOptions("type", "type");

  // Feedback options are JSON blobs (thumb up/down/null)
  const feedbackCheck = findCheck("feedback");
  const feedbackParam = feedbackCheck?.params.find(
    (param) => (param as CheckParam).type === "select",
  ) as (CheckParam & { options?: any[] }) | undefined;
  if (feedbackParam?.options && Array.isArray(feedbackParam.options)) {
    const mapped = feedbackParam.options.map((option: any) => {
      const thumb = option.thumb;
      if (thumb === "up") return '{"thumb":"up"} (thumbs up)';
      if (thumb === "down") return '{"thumb":"down"} (thumbs down)';
      return '{"thumb":null} (no feedback)';
    });
    lines.push(`feedback: ${mapped.join(", ")}`);
  }

  if (projectId) {
    const [models, tags, templates] = await Promise.all([
      sql`
        select distinct name
        from run
        where project_id = ${projectId}
          ${runType ? sql`and type = ${runType}` : sql``}
          and coalesce(name, '') <> ''
        order by name asc
        limit 12
      `.catch(() => []),
      sql`
        select distinct unnest(tags) as tag
        from run
        where project_id = ${projectId}
        limit 12
      `.catch(() => []),
      sql`
        select slug
        from template
        where project_id = ${projectId}
        order by slug asc
        limit 12
      `.catch(() => []),
    ]);

    availableModels = (models as any[])
      .map((row) => row.name)
      .filter((name: any) => typeof name === "string" && name.length);
    availableTags = (tags as any[])
      .map((row) => row.tag)
      .filter((tag: any) => typeof tag === "string" && tag.length);
    availableTemplates = (templates as any[])
      .map((row) => row.slug)
      .filter((slug: any) => typeof slug === "string" && slug.length);

    if (availableModels.length) {
      lines.push(`models (recent): ${availableModels.join(", ")}`);
    }
    if (availableTags.length) {
      lines.push(`tags: ${availableTags.join(", ")}`);
    }
    if (availableTemplates.length) {
      lines.push(`templates: ${availableTemplates.join(", ")}`);
    }
  }

  return {
    text: lines.length ? `- ${lines.join("\n- ")}` : null,
    models: availableModels,
    tags: availableTags,
    templates: availableTemplates,
  };
}

export function applyHeuristicClauses(
  text: string,
  plan: NormalizedPlan,
): HeuristicResult {
  const lower = text.toLowerCase();
  const descriptions: string[] = [];

  const existingIds = new Set(plan.clauses.map((clause) => clause.id));
  const heuristicClauses: NormalizedClause[] = [];

  const ensureClause = (clause: NormalizedClause, description: string) => {
    heuristicClauses.push(clause);
    descriptions.push(description);
  };

  if (!existingIds.has("cost")) {
    if (/(expensive|costly|high\s+cost)/.test(lower)) {
      ensureClause(
        {
          id: "cost",
          op: "gt",
          value: 1,
        },
        "Added cost > $1 for 'expensive' keyword.",
      );
    } else if (/(cheap|inexpensive|low\s+cost)/.test(lower)) {
      ensureClause(
        {
          id: "cost",
          op: "lt",
          value: 0.1,
        },
        "Added cost < $0.10 for 'cheap' keyword.",
      );
    }
  }

  if (!existingIds.has("duration")) {
    if (/(slow|long|took too long|lengthy)/.test(lower)) {
      ensureClause(
        {
          id: "duration",
          op: "gt",
          value: 10,
          unit: "seconds",
        },
        "Added duration > 10 seconds for 'slow/long' keyword.",
      );
    } else if (/(fast|quick|short)/.test(lower)) {
      ensureClause(
        {
          id: "duration",
          op: "lt",
          value: 2,
          unit: "seconds",
        },
        "Added duration < 2 seconds for 'fast/quick' keyword.",
      );
    }
  }

  if (!existingIds.has("feedback")) {
    if (/(negative feedback|bad feedback|thumbs? down)/.test(lower)) {
      ensureClause(
        {
          id: "feedback",
          thumbs: ["down"],
        },
        "Added negative feedback filter for 'negative feedback' keyword.",
      );
    } else if (/(positive feedback|good feedback|thumbs? up)/.test(lower)) {
      ensureClause(
        {
          id: "feedback",
          thumbs: ["up"],
        },
        "Added positive feedback filter for 'positive feedback' keyword.",
      );
    }
  }

  if (!existingIds.has("status")) {
    if (/(failed|errors?|errored)/.test(lower)) {
      ensureClause(
        {
          id: "status",
          values: ["error"],
        },
        "Added status=error for failure keyword.",
      );
    } else if (/(succeeded|successful|completed)/.test(lower)) {
      ensureClause(
        {
          id: "status",
          values: ["success"],
        },
        "Added status=success for success keyword.",
      );
    }
  }

  if (heuristicClauses.length === 0) {
    return { plan, descriptions };
  }

  return {
    plan: {
      ...plan,
      clauses: [...plan.clauses, ...heuristicClauses],
    },
    descriptions,
  };
}

export async function llmToNormalizedPlan(
  text: string,
  opts?: {
    hints?: string;
    allowed?: { models?: string[]; tags?: string[]; templates?: string[] };
  },
): Promise<NormalizedPlan> {
  const client = ensureClient();

  const tool = {
    type: "function" as const,
    function: {
      name: "emit_plan",
      description:
        "Emit a normalized plan describing the filters implied by the natural language request.",
      parameters: {
        type: "object",
        properties: {
          op: {
            type: "string",
            enum: ["AND", "OR"],
            description:
              "Boolean connective between top-level clauses. Prefer AND unless the user explicitly says otherwise.",
          },
          clauses: {
            type: "array",
            description:
              "Flat list of filter clauses. Use groups when the user implies parenthesis or explicit grouping.",
            items: {
              type: "object",
              required: ["id"],
              properties: {
                id: {
                  type: "string",
                  description:
                    "Canonical filter id such as duration, feedback, tokens, date, models, tags, users, languages, templates, status, metadata, cost, topics, toxicity, pii, type.",
                },
                op: {
                  type: "string",
                  enum: ["gt", "lt", "eq", "neq", "gte", "lte", "between"],
                },
                value: { type: ["number", "string", "boolean"] },
                range: {
                  type: "array",
                  items: { type: "number" },
                  minItems: 2,
                  maxItems: 2,
                },
                unit: {
                  type: "string",
                  enum: ["seconds", "ms", "minutes", "hours", "days"],
                },
                field: {
                  type: "string",
                  enum: [
                    "total",
                    "prompt",
                    "completion",
                    "input",
                    "output",
                    "any",
                  ],
                },
                values: {
                  type: "array",
                  items: { type: ["string", "number", "boolean"] },
                },
                iso: {
                  oneOf: [
                    { type: "string" },
                    {
                      type: "array",
                      items: { type: "string" },
                      minItems: 2,
                      maxItems: 2,
                    },
                  ],
                },
                thumbs: {
                  type: "array",
                  items: { type: "string", enum: ["up", "down", "null"] },
                },
                key: { type: "string" },
                flag: { type: "string" },
              },
            },
          },
          groups: {
            type: "array",
            description:
              "Nested boolean groups to express parentheses. Each group has its own op and clauses.",
            items: {
              type: "object",
              required: ["op", "clauses"],
              properties: {
                op: { type: "string", enum: ["AND", "OR"] },
                clauses: { $ref: "#/properties/clauses/items" },
              },
            },
          },
          unmatched: {
            type: "array",
            description:
              "Terms from the request that could not be matched to supported filters.",
            items: { type: "string" },
          },
        },
      },
    },
  };

  const baseSystemMessage =
    "You translate natural language filter requests for Lunary run logs into a structured NormalizedPlan. " +
    "Supported filter ids include: type, duration, cost, tokens, date, feedback, status, models, tags, users, languages, templates, metadata, topics, toxicity, pii. " +
    "Use seconds for duration by default. Map negative feedback to thumbs down, positive to thumbs up, neutral to null. " +
    "Return precise numeric values instead of loose prose. Default the plan op to AND unless the user is explicit about OR.";

  const messages: ChatMessageParam[] = [
    {
      role: "system",
      content: baseSystemMessage,
    },
  ];

  if (opts?.hints) {
    messages.push({
      role: "system",
      content: `Available filter values for this project:\n${opts.hints}`,
    });
  }

  if (opts?.allowed) {
    const parts: string[] = [];
    if (opts.allowed.models?.length) {
      parts.push(
        `Valid models: ${opts.allowed.models.join(", ")}. Never invent model names; if the user gives a family label such as "gpt", expand to every listed model containing that string.`,
      );
    }
    if (opts.allowed.tags?.length) {
      parts.push(
        `Valid tags: ${opts.allowed.tags.join(", ")}. Only emit tags from this list.`,
      );
    }
    if (opts.allowed.templates?.length) {
      parts.push(
        `Valid templates: ${opts.allowed.templates.join(", ")}. Only emit template identifiers from this list.`,
      );
    }
    if (parts.length) {
      messages.push({
        role: "system",
        content: parts.join("\n"),
      });
    }
  }

  messages.push({ role: "user", content: text });

  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools: [tool],
    tool_choice: { type: "function", function: { name: "emit_plan" } },
    reasoning_effort: "minimal",
    store: true,
  });

  const toolCall =
    response.choices[0]?.message?.tool_calls?.find(
      (call) => call.function?.name === "emit_plan",
    ) ?? null;

  if (!toolCall?.function?.arguments) {
    return NormalizedPlanSchema.parse({});
  }

  let parsed;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch (error) {
    throw new Error("Failed to parse plan emitted by OpenAI");
  }

  return NormalizedPlanSchema.parse(parsed);
}

const findCheck = (id: string) =>
  CHECKS.find((candidate) => candidate.id === id);

const buildTypeLeaf = (runType: RunType): LogicElement | undefined => {
  const typeCheck = findCheck("type");
  if (!typeCheck) return undefined;

  const params = getRuntimeParams("type");
  const selectParam = params.find(
    (param) => param.type === "select" && !(param as any).multiple,
  );

  if (!selectParam) return undefined;

  const value = SUPPORTED_RUN_TYPES.has(runType)
    ? runType
    : ((selectParam.defaultValue as string | undefined) ?? "llm");

  return {
    id: "type",
    params: {
      [selectParam.id]: value,
    },
  };
};

const setParamValue = (
  params: Record<string, any>,
  param: CheckParam | undefined,
  value: any,
) => {
  if (!param) return false;
  if (value === undefined || value === null) return false;

  switch (param.type) {
    case "number": {
      const numeric =
        typeof value === "number"
          ? value
          : typeof value === "string"
            ? Number(value)
            : NaN;
      if (!Number.isFinite(numeric)) return false;
      params[param.id] = numeric;
      return true;
    }
    case "text": {
      const text = Array.isArray(value) ? value[0] : value;
      if (text === undefined) return false;
      params[param.id] = String(text);
      return true;
    }
    case "date": {
      const date =
        value instanceof Date
          ? value
          : typeof value === "string"
            ? new Date(value)
            : undefined;
      if (!date || Number.isNaN(date.getTime())) return false;
      params[param.id] = date.toISOString();
      return true;
    }
    case "select": {
      if ((param as any).multiple) {
        const values = asArray(value)
          .map((item) => String(item))
          .filter((item) => item.length);
        if (!values.length) return false;
        params[param.id] = values;
        return true;
      }
      params[param.id] = String(value);
      return true;
    }
    case "users": {
      const values = asArray(value)
        .map((item) => String(item))
        .filter((item) => item.length);
      if (!values.length) return false;
      params[param.id] = values;
      return true;
    }
    default:
      return false;
  }
};

const compileClause = (
  clause: NormalizedClause,
  unmatched: string[],
  allowedLists: { models: string[]; tags: string[]; templates: string[] },
): LogicElement[] => {
  const runtimeParams = getRuntimeParams(clause.id);
  if (!runtimeParams.length) {
    unmatched.push(`Unsupported filter id: ${clause.id}`);
    return [];
  }

  const paramsObject: Record<string, any> = {};

  const singleSelects = runtimeParams.filter(
    (param) => param.type === "select" && !(param as any).multiple,
  );
  const multiSelect = runtimeParams.find(
    (param) => param.type === "select" && (param as any).multiple,
  );
  const firstSelect = singleSelects[0];
  const secondSelect = singleSelects[1];
  const numberParam = runtimeParams.find((param) => param.type === "number");
  const dateParam = runtimeParams.find((param) => param.type === "date");
  const textParam = runtimeParams.find((param) => param.type === "text");
  const usersParam = runtimeParams.find((param) => param.type === "users");

  const createLeaf = () => ({
    id: clause.id,
    params: paramsObject,
  });

  switch (clause.id) {
    case "duration": {
      const operator = normalizeComparison(clause.op, "gt");
      if (operator === "between") {
        if (!clause.range) {
          unmatched.push("Duration range missing bounds");
          return [];
        }

        const [minRaw, maxRaw] = clause.range;
        const min = Number.isFinite(minRaw)
          ? toSeconds(minRaw, clause.unit)
          : NaN;
        const max = Number.isFinite(maxRaw)
          ? toSeconds(maxRaw, clause.unit)
          : NaN;

        if (!Number.isFinite(min) || !Number.isFinite(max)) {
          unmatched.push("Duration range contains invalid numbers");
          return [];
        }

        const lowerParams: Record<string, any> = {};
        const upperParams: Record<string, any> = {};

        const setLowerOperator = setParamValue(lowerParams, firstSelect, "gt");
        const setLowerValue = setParamValue(lowerParams, numberParam, min);
        const setUpperOperator = setParamValue(upperParams, firstSelect, "lt");
        const setUpperValue = setParamValue(upperParams, numberParam, max);

        if (
          setLowerOperator &&
          setLowerValue &&
          setUpperOperator &&
          setUpperValue
        ) {
          return [
            [
              "AND",
              { id: "duration", params: lowerParams },
              { id: "duration", params: upperParams },
            ] as LogicNode,
          ];
        }

        unmatched.push("Could not map duration range to existing params");
        return [];
      }

      const numericValue =
        typeof clause.value === "number"
          ? clause.value
          : clause.value != null
            ? Number(clause.value)
            : undefined;

      if (!Number.isFinite(numericValue ?? NaN)) {
        unmatched.push("Duration clause missing numeric value");
        return [];
      }

      const seconds = toSeconds(Number(numericValue), clause.unit);
      const setOperator = setParamValue(paramsObject, firstSelect, operator);
      const setValue = setParamValue(paramsObject, numberParam, seconds);

      if (setOperator && setValue) {
        return [createLeaf()];
      }

      unmatched.push("Failed to assign duration parameters");
      return [];
    }

    case "cost": {
      const operator = normalizeComparison(clause.op, "gt");
      const numericValue =
        typeof clause.value === "number"
          ? clause.value
          : clause.value != null
            ? Number(clause.value)
            : undefined;

      if (!Number.isFinite(numericValue ?? NaN)) {
        unmatched.push("Cost clause missing numeric value");
        return [];
      }

      const setOperator = setParamValue(paramsObject, firstSelect, operator);
      const setValue = setParamValue(paramsObject, numberParam, numericValue);
      if (setOperator && setValue) {
        return [createLeaf()];
      }

      unmatched.push("Failed to assign cost parameters");
      return [];
    }

    case "tokens": {
      const operator = normalizeComparison(clause.op, "gt");
      const numericValue =
        typeof clause.value === "number"
          ? clause.value
          : clause.value != null
            ? Number(clause.value)
            : undefined;

      if (!Number.isFinite(numericValue ?? NaN)) {
        unmatched.push("Tokens clause missing numeric value");
        return [];
      }

      const fieldParam =
        singleSelects.find((param) =>
          (param as any).options?.some((option: any) =>
            ["total", "prompt", "completion"].includes(String(option.value)),
          ),
        ) ?? firstSelect;

      const operatorParam =
        singleSelects.find((param) =>
          (param as any).options?.some((option: any) =>
            numericOps.has(String(option.value)),
          ),
        ) ?? (fieldParam === firstSelect ? secondSelect : firstSelect);

      const setField = setParamValue(
        paramsObject,
        fieldParam,
        clause.field ?? "total",
      );
      const setOperator = setParamValue(paramsObject, operatorParam, operator);
      const setValue = setParamValue(paramsObject, numberParam, numericValue);

      if (setField && setOperator && setValue) {
        return [createLeaf()];
      }

      unmatched.push("Failed to assign tokens parameters");
      return [];
    }

    case "feedback": {
      const values = buildFeedbackValues(clause);
      if (!values.length) {
        unmatched.push("Feedback clause did not produce any thumbs");
        return [];
      }

      const setValues = setParamValue(paramsObject, multiSelect, values);
      if (setValues) {
        return [createLeaf()];
      }

      unmatched.push("Failed to map feedback thumbs to params");
      return [];
    }

    case "date": {
      const operator = normalizeComparison(clause.op, "gt");

      if (operator === "between") {
        const iso = clause.iso;
        if (!Array.isArray(iso)) {
          unmatched.push("Date between clause missing ISO range");
          return [];
        }

        const [start, end] = iso;
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (
          Number.isNaN(startDate.getTime()) ||
          Number.isNaN(endDate.getTime())
        ) {
          unmatched.push("Date range contains invalid ISO values");
          return [];
        }

        const lowerParams: Record<string, any> = {};
        const upperParams: Record<string, any> = {};

        const setLowerOperator = setParamValue(lowerParams, firstSelect, "gt");
        const setLowerValue = setParamValue(lowerParams, dateParam, startDate);
        const setUpperOperator = setParamValue(upperParams, firstSelect, "lt");
        const setUpperValue = setParamValue(upperParams, dateParam, endDate);

        if (
          setLowerOperator &&
          setLowerValue &&
          setUpperOperator &&
          setUpperValue
        ) {
          return [
            [
              "AND",
              { id: "date", params: lowerParams },
              { id: "date", params: upperParams },
            ] as LogicNode,
          ];
        }

        unmatched.push("Failed to map date range parameters");
        return [];
      }

      const isoValue =
        Array.isArray(clause.iso) || clause.iso == null
          ? clause.value
          : clause.iso;

      if (typeof isoValue !== "string") {
        unmatched.push("Date clause missing ISO value");
        return [];
      }

      const setOperator = setParamValue(paramsObject, firstSelect, operator);
      const setDate = setParamValue(paramsObject, dateParam, isoValue);

      if (setOperator && setDate) {
        return [createLeaf()];
      }

      unmatched.push("Failed to assign date parameters");
      return [];
    }

    case "status": {
      const value =
        clause.values?.[0] ??
        (typeof clause.value === "string" ? clause.value : undefined);

      if (!value) {
        unmatched.push("Status clause missing value");
        return [];
      }

      if (setParamValue(paramsObject, firstSelect, value)) {
        return [createLeaf()];
      }

      unmatched.push("Failed to map status clause");
      return [];
    }

    case "models":
    case "tags":
    case "templates": {
      const baseValues =
        clause.values && clause.values.length
          ? clause.values
          : clause.value != null
            ? [String(clause.value)]
            : [];

      let values = baseValues;

      if (clause.id === "models" && allowedLists.models.length) {
        const lowerAllowed = allowedLists.models.map((value) =>
          value.toLowerCase(),
        );
        const filtered = baseValues.flatMap((value) => {
          const normalized = value.toLowerCase();
          // Exact match
          if (lowerAllowed.includes(normalized)) {
            return [allowedLists.models[lowerAllowed.indexOf(normalized)]];
          }
          // Prefix/suffix match (e.g., "gpt" should match "gpt-4o")
          const matching = allowedLists.models.filter((candidate) =>
            candidate.toLowerCase().includes(normalized),
          );
          return matching;
        });

        const uniqueFiltered = Array.from(new Set(filtered));

        if (!uniqueFiltered.length) {
          unmatched.push(`ignored model values: ${baseValues.join(",")}`);
          return [];
        }
        values = uniqueFiltered;
      }

      if (clause.id === "tags" && allowedLists.tags.length) {
        const filtered = baseValues.filter((value) =>
          allowedLists.tags.includes(value),
        );
        if (!filtered.length) {
          unmatched.push(`ignored tag values: ${baseValues.join(",")}`);
          return [];
        }
        values = filtered;
      }

      if (clause.id === "templates" && allowedLists.templates.length) {
        const filtered = baseValues.filter((value) =>
          allowedLists.templates.includes(value),
        );
        if (!filtered.length) {
          unmatched.push(`ignored template values: ${baseValues.join(",")}`);
          return [];
        }
        values = filtered;
      }

      if (!values.length) {
        unmatched.push(`${clause.id} clause missing values`);
        return [];
      }

      const targetParam = multiSelect ?? firstSelect;
      if (setParamValue(paramsObject, targetParam, values)) {
        return [createLeaf()];
      }

      unmatched.push(`Failed to map ${clause.id} clause`);
      return [];
    }

    case "topics":
    case "toxicity": {
      setParamValue(
        paramsObject,
        firstSelect,
        clause.field ?? clause.flag ?? "output",
      );

      const values =
        clause.values && clause.values.length
          ? clause.values
          : clause.value != null
            ? [String(clause.value)]
            : [];

      if (values.length && setParamValue(paramsObject, multiSelect, values)) {
        return [createLeaf()];
      }

      unmatched.push(`Failed to map ${clause.id} clause`);
      return [];
    }

    case "languages": {
      setParamValue(paramsObject, firstSelect, clause.field ?? "any");

      const values =
        clause.values && clause.values.length
          ? clause.values
          : clause.value != null
            ? [String(clause.value)]
            : [];

      if (values.length && setParamValue(paramsObject, multiSelect, values)) {
        return [createLeaf()];
      }

      unmatched.push("Languages clause missing language codes");
      return [];
    }

    case "pii": {
      const value =
        clause.flag ??
        clause.values?.[0] ??
        (typeof clause.value === "string" ? clause.value : undefined) ??
        "true";

      if (setParamValue(paramsObject, firstSelect, value)) {
        return [createLeaf()];
      }

      unmatched.push("Failed to map pii clause");
      return [];
    }

    case "metadata": {
      const key = clause.key ?? clause.values?.[0] ?? clause.value;
      const value =
        clause.value ??
        clause.values?.[1] ??
        (Array.isArray(clause.iso) ? clause.iso[0] : clause.iso);

      const setKey = setParamValue(paramsObject, firstSelect, key);
      const setValue =
        setParamValue(paramsObject, textParam, value) ||
        setParamValue(paramsObject, numberParam, value);

      if (setKey && setValue) {
        return [createLeaf()];
      }

      unmatched.push("Metadata clause requires both key and value");
      return [];
    }

    case "users": {
      const values =
        clause.values && clause.values.length
          ? clause.values
          : clause.value != null
            ? [String(clause.value)]
            : [];

      if (!values.length) {
        unmatched.push("Users clause missing identifiers");
        return [];
      }

      const success = setParamValue(paramsObject, usersParam, values);
      if (success) {
        return [createLeaf()];
      }

      unmatched.push("Failed to map users clause");
      return [];
    }

    case "type": {
      const value =
        clause.values?.[0] ??
        (typeof clause.value === "string" ? clause.value : undefined);

      if (!value) {
        unmatched.push("Type clause missing value");
        return [];
      }

      const success = setParamValue(paramsObject, firstSelect, value);
      if (success) {
        return [createLeaf()];
      }

      unmatched.push("Failed to map type clause");
      return [];
    }

    default: {
      unmatched.push(`No compiler implemented for ${clause.id}`);
      return [];
    }
  }
};

export function compilePlanToCheckLogic(
  plan: NormalizedPlan,
  runType: RunType = "llm",
  allowedLists: { models: string[]; tags: string[]; templates: string[] } = {
    models: [],
    tags: [],
    templates: [],
  },
): { logic: CheckLogic; unmatched: string[] } {
  const unmatched = [...(plan.unmatched ?? [])];

  const containsTypeClause =
    plan.clauses.some((clause) => clause.id === "type") ||
    plan.groups.some((group) =>
      group.clauses.some((clause) => clause.id === "type"),
    );

  const topElements: LogicElement[] = [];

  if (!containsTypeClause) {
    const typeLeaf = buildTypeLeaf(runType);
    if (typeLeaf) {
      topElements.push(typeLeaf);
    } else {
      unmatched.push("Unable to add default type filter");
    }
  }

  const planElements: LogicElement[] = [];

  for (const clause of plan.clauses) {
    const compiled = compileClause(clause, unmatched, allowedLists);
    planElements.push(...compiled);
  }

  for (const group of plan.groups ?? []) {
    const groupElements: LogicElement[] = [];
    for (const clause of group.clauses) {
      const compiled = compileClause(clause, unmatched, allowedLists);
      groupElements.push(...compiled);
    }

    if (groupElements.length) {
      planElements.push([group.op, ...groupElements] as LogicNode);
    }
  }

  if (planElements.length) {
    if (plan.op === "OR" && planElements.length > 1) {
      topElements.push(["OR", ...planElements] as LogicNode);
    } else {
      topElements.push(...planElements);
    }
  }

  const logic = ["AND", ...topElements] as LogicNode;

  return { logic, unmatched };
}

export async function naturalLanguageToFilters(
  text: string,
  opts?: { type?: RunType; projectId?: string },
): Promise<{
  logic: CheckLogic;
  query: string;
  details: {
    normalizedPlan: NormalizedPlan;
    unmatched: string[];
    heuristics: string[];
    hints?: string;
    availableModels: string[];
    availableTags: string[];
    availableTemplates: string[];
  };
}> {
  const runType: RunType =
    opts?.type && SUPPORTED_RUN_TYPES.has(opts.type) ? opts.type : "llm";

  const hintsResult = await buildFilterHints(opts?.projectId, runType);

  const normalizedPlan = await llmToNormalizedPlan(text, {
    hints: hintsResult.text ?? undefined,
    allowed: {
      models: hintsResult.models,
      tags: hintsResult.tags,
      templates: hintsResult.templates,
    },
  });

  const heuristicsResult = applyHeuristicClauses(text, normalizedPlan);
  const { logic, unmatched } = compilePlanToCheckLogic(
    heuristicsResult.plan,
    runType,
    { models: hintsResult.models, tags: hintsResult.tags },
  );

  const activeLeaves = logic.slice(1);
  let finalLogic: CheckLogic = logic;

  if (!activeLeaves.length) {
    const fallbackTypeLeaf = buildTypeLeaf(runType);
    finalLogic = fallbackTypeLeaf
      ? (["AND", fallbackTypeLeaf] as LogicNode)
      : (["AND"] as LogicNode);
  }

  const query = serializeLogic(finalLogic);

  return {
    logic: finalLogic,
    query,
    details: {
      normalizedPlan: heuristicsResult.plan,
      unmatched,
      heuristics: heuristicsResult.descriptions,
      hints: hintsResult.text ?? undefined,
      availableModels: hintsResult.models,
      availableTags: hintsResult.tags,
      availableTemplates: hintsResult.templates,
    },
  };
}
