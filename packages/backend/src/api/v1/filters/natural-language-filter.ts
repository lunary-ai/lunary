import OpenAI from "openai";
import {
  CHECKS,
  serializeLogic,
  type CheckLogic,
  type CheckParam,
  type LogicElement,
  type LogicNode,
} from "shared";
import { z } from "zod";

import sql from "@/src/utils/db";
import lunary from "lunary";
import { monitorOpenAI } from "lunary/openai";

export class OpenAINotConfiguredError extends Error {
  constructor() {
    super("An OpenAI API key is required to run AI filter.");
    this.name = "OpenAINotConfiguredError";
  }
}
/**
 * Model choice
 */
const MODEL = "gpt-5";

/**
 * Supported run types
 */
export type RunType = "llm" | "trace" | "thread" | "tool" | "retriever";
const SUPPORTED_RUN_TYPES = new Set<RunType>([
  "llm",
  "trace",
  "thread",
  "tool",
  "retriever",
]);

/**
 * OpenAI client
 */
lunary.init({ publicKey: process.env.LUNARY_AI_FILTER_API_KEY });

const openai = monitorOpenAI(new OpenAI());

/* ------------------------------------------------------------------------------------------
 * 1) Normalized plan (LLM output) — keep it small and predictable
 * ----------------------------------------------------------------------------------------*/

const NormalizedClauseSchema = z.object({
  id: z.string(), // canonical filter id, e.g., "duration", "status", "models", ...
  op: z.enum(["gt", "lt", "eq", "neq", "gte", "lte", "between"]).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  values: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  range: z.tuple([z.coerce.number(), z.coerce.number()]).optional(),
  unit: z.enum(["seconds", "ms", "minutes", "hours", "days"]).optional(),
  field: z
    .enum(["total", "prompt", "completion", "input", "output", "any"])
    .optional(),
  iso: z.union([z.string(), z.tuple([z.string(), z.string()])]).optional(),
  thumbs: z.array(z.enum(["up", "down", "null"])).optional(),
  key: z.string().optional(), // for metadata
  flag: z.string().optional(), // for pii/topics/toxicity switches
});

const NormalizedGroupSchema = z.object({
  op: z.enum(["AND", "OR"]).default("AND"),
  clauses: z.array(NormalizedClauseSchema).min(1),
});

const NormalizedPlanSchema = z.object({
  op: z.enum(["AND", "OR"]).default("AND"),
  clauses: z.array(NormalizedClauseSchema).default([]),
  groups: z.array(NormalizedGroupSchema).default([]),
  unmatched: z.array(z.string()).default([]),
});

export type NormalizedClause = z.infer<typeof NormalizedClauseSchema>;
export type NormalizedGroup = z.infer<typeof NormalizedGroupSchema>;
export type NormalizedPlan = z.infer<typeof NormalizedPlanSchema>;

/* ------------------------------------------------------------------------------------------
 * 2) Filter registry (dynamic per project) -> used to build tool schema
 * ----------------------------------------------------------------------------------------*/

type FilterSpec =
  | {
      id: "duration" | "cost";
      kind: "number";
      ops: Array<"gt" | "lt" | "eq" | "neq" | "gte" | "lte" | "between">;
      units: Array<"seconds" | "ms" | "minutes" | "hours" | "days">;
    }
  | {
      id: "tokens";
      kind: "tokens";
      ops: Array<"gt" | "lt" | "eq" | "neq" | "gte" | "lte" | "between">;
      fields: Array<"total" | "prompt" | "completion">;
    }
  | { id: "date"; kind: "date"; ops: Array<"gt" | "lt" | "between"> }
  | { id: "feedback"; kind: "thumbs" }
  | { id: "status"; kind: "enum"; values: string[] } // static from CHECKS
  | { id: "type"; kind: "enum"; values: RunType[] } // static
  | {
      id: "models" | "tags" | "templates";
      kind: "multi-enum";
      values: string[];
    } // dynamic
  | { id: "languages"; kind: "multi-enum"; values: string[] } // keep loose/empty if unknown
  | { id: "users"; kind: "multi-enum"; values: string[] } // keep loose/empty if unknown
  | {
      id: "topics" | "toxicity" | "pii";
      kind: "flag-or-list";
      values?: string[];
    } // optional lists
  | { id: "metadata"; kind: "kv" }
  | { id: "tools" | "retrievers"; kind: "text" };

const asArray = <T>(x: T | T[] | undefined | null) =>
  x == null ? [] : Array.isArray(x) ? x : [x];

// Helpers to introspect static "select" options from CHECKS
const findCheck = (id: string) => CHECKS.find((c) => c.id === id);

type Labelish = { label?: string; value?: any } | string | number | boolean;

const pickStaticSelectValues = (checkId: string): string[] => {
  const check = findCheck(checkId);
  if (!check) return [];
  const selects = check.params.filter(
    (p: any) => p.type === "select" && Array.isArray(p.options),
  ) as Array<CheckParam & { options: Labelish[] }>;

  if (!selects.length) return [];
  const first = selects[0];
  return first.options
    .map((o) => (typeof o === "object" && o !== null ? (o.value ?? o) : o))
    .map(String);
};

// Project-scoped dynamic values
async function loadProjectOptions(projectId?: string, runType?: RunType) {
  if (!projectId) {
    return {
      models: [] as string[],
      tags: [] as string[],
      templates: [] as string[],
    };
  }

  const [modelsRows, tagsRows, templatesRows] = await Promise.all([
    sql`
      select distinct name
      from run
      where project_id = ${projectId}
        ${runType ? sql`and type = ${runType}` : sql``}
        and coalesce(name, '') <> ''
      order by name asc
      limit 100
    `.catch(() => []),
    sql`
      select distinct unnest(tags) as tag
      from run
      where project_id = ${projectId}
      limit 100
    `.catch(() => []),
    sql`
      select slug
      from template
      where project_id = ${projectId}
      order by slug asc
      limit 100
    `.catch(() => []),
  ]);

  const models = (modelsRows as any[]).map((r) => r.name).filter(Boolean);
  const tags = (tagsRows as any[]).map((r) => r.tag).filter(Boolean);
  const templates = (templatesRows as any[]).map((r) => r.slug).filter(Boolean);

  return { models, tags, templates };
}

function buildFilterSpecs(
  projectOpts: Awaited<ReturnType<typeof loadProjectOptions>>,
  runType: RunType,
): FilterSpec[] {
  return [
    { id: "type", kind: "enum", values: Array.from(SUPPORTED_RUN_TYPES) },
    {
      id: "duration",
      kind: "number",
      ops: ["gt", "lt", "eq", "neq", "gte", "lte", "between"],
      units: ["seconds", "ms", "minutes", "hours", "days"],
    },
    {
      id: "cost",
      kind: "number",
      ops: ["gt", "lt", "eq", "neq", "gte", "lte", "between"],
      units: ["seconds", "ms", "minutes", "hours", "days"], // unit optional for cost; leave for schema reuse (ignored in compiler)
    },
    {
      id: "tokens",
      kind: "tokens",
      ops: ["gt", "lt", "eq", "neq", "gte", "lte", "between"],
      fields: ["total", "prompt", "completion"],
    },
    { id: "date", kind: "date", ops: ["gt", "lt", "between"] },
    { id: "feedback", kind: "thumbs" },
    { id: "status", kind: "enum", values: pickStaticSelectValues("status") },
    { id: "models", kind: "multi-enum", values: projectOpts.models },
    { id: "tags", kind: "multi-enum", values: projectOpts.tags },
    { id: "templates", kind: "multi-enum", values: projectOpts.templates },
    // keep these extensible; if you don't have enumerations yet, leave arrays empty
    { id: "languages", kind: "multi-enum", values: [] },
    { id: "users", kind: "multi-enum", values: [] },
    { id: "topics", kind: "flag-or-list", values: [] },
    { id: "toxicity", kind: "flag-or-list", values: [] },
    { id: "pii", kind: "flag-or-list", values: ["true", "false"] },
    { id: "metadata", kind: "kv" },
    ...(runType === "tool"
      ? ([{ id: "tools", kind: "text" }] as FilterSpec[])
      : []),
    ...(runType === "retriever"
      ? ([{ id: "retrievers", kind: "text" }] as FilterSpec[])
      : []),
  ];
}

/* ------------------------------------------------------------------------------------------
 * 3) Build a single tool with per-filter schemas (no "hints" in messages)
 * ----------------------------------------------------------------------------------------*/

type ToolSpec = OpenAI.Chat.Completions.ChatCompletionTool;

function buildEmitPlanTool(specs: FilterSpec[]): ToolSpec {
  const clauseVariants: any[] = [];

  const opEnum = ["gt", "lt", "eq", "neq", "gte", "lte", "between"];
  const unitEnum = ["seconds", "ms", "minutes", "hours", "days"];
  const fieldEnum = ["total", "prompt", "completion", "input", "output", "any"];
  const thumbsEnum = ["up", "down", "null"];

  const push = (schema: any) => clauseVariants.push(schema);

  // helpers
  const enumProp = (values: string[] | number[]) =>
    values.length
      ? {
          type: typeof values[0] === "number" ? "number" : "string",
          enum: values,
        }
      : { type: "string" };

  for (const s of specs) {
    switch (s.kind) {
      case "number": {
        push({
          type: "object",
          required: ["id", "op"],
          properties: {
            id: { type: "string", enum: [s.id] },
            op: { type: "string", enum: s.ops },
            value: { type: "number" },
            range: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
            },
            unit: { type: "string", enum: s.units },
          },
        });
        break;
      }
      case "tokens": {
        push({
          type: "object",
          required: ["id", "op"],
          properties: {
            id: { type: "string", enum: [s.id] },
            field: { type: "string", enum: s.fields },
            op: { type: "string", enum: s.ops },
            value: { type: "number" },
            range: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
            },
          },
        });
        break;
      }
      case "date": {
        push({
          type: "object",
          required: ["id", "op"],
          properties: {
            id: { type: "string", enum: [s.id] },
            op: { type: "string", enum: s.ops },
            iso: {
              oneOf: [
                { type: "string" }, // single ISO
                {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2,
                  maxItems: 2,
                }, // range
              ],
            },
          },
        });
        break;
      }
      case "thumbs": {
        push({
          type: "object",
          required: ["id", "thumbs"],
          properties: {
            id: { type: "string", enum: ["feedback"] },
            thumbs: {
              type: "array",
              items: { type: "string", enum: thumbsEnum },
              minItems: 1,
              uniqueItems: true,
            },
          },
        });
        break;
      }
      case "enum": {
        push({
          type: "object",
          required: ["id", "value"],
          properties: {
            id: { type: "string", enum: [s.id] },
            value: enumProp(s.values),
          },
        });
        break;
      }
      case "text": {
        push({
          type: "object",
          required: ["id", "value"],
          properties: {
            id: { type: "string", enum: [s.id] },
            value: { type: "string" },
          },
        });
        break;
      }
      case "multi-enum": {
        push({
          type: "object",
          required: ["id", "values"],
          properties: {
            id: { type: "string", enum: [s.id] },
            values: {
              type: "array",
              items: enumProp(s.values),
              minItems: 1,
              uniqueItems: true,
            },
          },
        });
        break;
      }
      case "flag-or-list": {
        push({
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", enum: [s.id] },
            flag:
              s.values && s.values.length
                ? enumProp(s.values)
                : { type: "string" },
            values:
              s.values && s.values.length
                ? {
                    type: "array",
                    items: enumProp(s.values),
                    minItems: 1,
                    uniqueItems: true,
                  }
                : { type: "array", items: { type: "string" } },
            field: { type: "string", enum: fieldEnum }, // e.g., topics on 'input'/'output'
          },
        });
        break;
      }
      case "kv": {
        push({
          type: "object",
          required: ["id", "key"],
          properties: {
            id: { type: "string", enum: ["metadata"] },
            key: { type: "string" },
            value: { oneOf: [{ type: "string" }, { type: "number" }] },
          },
        });
        break;
      }
      default:
        break;
    }
  }

  const planSchema = {
    type: "object",
    properties: {
      op: { type: "string", enum: ["AND", "OR"] },
      clauses: {
        type: "array",
        description:
          "Flat list of filter clauses. Use groups if the user implies parentheses.",
        items: { oneOf: clauseVariants },
      },
      groups: {
        type: "array",
        items: {
          type: "object",
          required: ["op", "clauses"],
          properties: {
            op: { type: "string", enum: ["AND", "OR"] },
            clauses: {
              type: "array",
              items: { oneOf: clauseVariants },
              minItems: 1,
            },
          },
        },
      },
      unmatched: {
        type: "array",
        description: "Terms from the request that could not be matched.",
        items: { type: "string" },
      },
    },
  };

  return {
    type: "function",
    function: {
      name: "emit_plan",
      description:
        "Emit a normalized plan describing the filters implied by the natural language request. Only use allowed values provided by the schema.",
      parameters: planSchema,
    },
  };
}

/* ------------------------------------------------------------------------------------------
 * 4) LLM call — no hints, no spaghetti; let schema do the constraint work
 * ----------------------------------------------------------------------------------------*/

async function llmToNormalizedPlan(
  text: string,
  specs: FilterSpec[],
): Promise<NormalizedPlan> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You translate natural-language filter requests for Lunary into a NormalizedPlan. " +
        "Prefer op=AND unless the user explicitly says OR. " +
        "For numeric filters, use precise numbers. " +
        "For duration, seconds are the default unit if omitted. " +
        "For feedback, map to thumbs: up/down/null.",
    },
    { role: "user", content: text },
  ];

  const tool = buildEmitPlanTool(specs);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages,
    tools: [tool],
    tool_choice: { type: "function", function: { name: "emit_plan" } },
    reasoning_effort: "minimal",
  });

  const toolCalls = response.choices[0]?.message?.tool_calls as
    | OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
    | undefined;

  const toolCall =
    toolCalls?.find(
      (
        call: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
      ): call is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
        call.type === "function" && call.function.name === "emit_plan",
    ) ?? null;

  if (!toolCall?.function?.arguments) {
    return NormalizedPlanSchema.parse({});
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error("Failed to parse plan emitted by OpenAI");
  }

  return NormalizedPlanSchema.parse(parsed);
}

/* ------------------------------------------------------------------------------------------
 * 5) Compile plan -> CheckLogic (thin, per-filter compilers)
 * ----------------------------------------------------------------------------------------*/

const toSeconds = (v: number, unit?: string) => {
  switch (unit) {
    case "ms":
      return v / 1000;
    case "minutes":
      return v * 60;
    case "hours":
      return v * 3600;
    case "days":
      return v * 86400;
    case "seconds":
    default:
      return v;
  }
};

const getRuntimeParams = (checkId: string): CheckParam[] => {
  const check = CHECKS.find((c) => c.id === checkId);
  if (!check) return [];
  return check.params.filter((p: any) => p.type !== "label") as CheckParam[];
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
      const num =
        typeof value === "number"
          ? value
          : typeof value === "string"
            ? Number(value)
            : NaN;
      if (!Number.isFinite(num)) return false;
      params[param.id] = num;
      return true;
    }
    case "text": {
      params[param.id] = String(value);
      return true;
    }
    case "date": {
      const d =
        value instanceof Date
          ? value
          : typeof value === "string"
            ? new Date(value)
            : undefined;
      if (!d || Number.isNaN(d.getTime())) return false;
      params[param.id] = d.toISOString();
      return true;
    }
    case "select": {
      if ((param as any).multiple) {
        const vals = asArray(value).map(String).filter(Boolean);
        if (!vals.length) return false;
        params[param.id] = vals;
        return true;
      }
      params[param.id] = String(value);
      return true;
    }
    case "users": {
      const vals = asArray(value).map(String).filter(Boolean);
      if (!vals.length) return false;
      params[param.id] = vals;
      return true;
    }
    default:
      return false;
  }
};

function buildFeedbackValues(thumbs?: Array<"up" | "down" | "null">) {
  if (!thumbs?.length) return [];
  return thumbs.map((t) => JSON.stringify({ thumb: t === "null" ? null : t }));
}

/**
 * Compile a single clause into one or more LogicElements/Nodes
 */
function compileClause(
  clause: NormalizedClause,
  unmatched: string[],
  allowed: { models: string[]; tags: string[]; templates: string[] },
): LogicElement[] {
  const params = getRuntimeParams(clause.id);
  if (!params.length) {
    unmatched.push(`Unsupported filter id: ${clause.id}`);
    return [];
  }

  const singleSelects = params.filter(
    (p: any) => p.type === "select" && !(p as any).multiple,
  );
  const multiSelect = params.find(
    (p: any) => p.type === "select" && (p as any).multiple,
  );
  const firstSelect = singleSelects[0];
  const secondSelect = singleSelects[1];
  const numberParam = params.find((p) => p.type === "number");
  const dateParam = params.find((p) => p.type === "date");
  const textParam = params.find((p) => p.type === "text");
  const usersParam = params.find((p) => p.type === "users");

  const leaf = (p: Record<string, any>): LogicElement => ({
    id: clause.id,
    params: p,
  });

  switch (clause.id) {
    case "duration":
    case "cost": {
      const operator = clause.op ?? "gt";
      if (operator === "between") {
        const range = clause.range;
        if (
          !range ||
          range.length !== 2 ||
          !Number.isFinite(range[0]) ||
          !Number.isFinite(range[1])
        ) {
          unmatched.push(`${clause.id} range requires two numbers`);
          return [];
        }
        const lower: Record<string, any> = {};
        const upper: Record<string, any> = {};
        const unitSecs =
          clause.id === "duration" ? toSeconds : (x: number) => x;
        const ok =
          setParamValue(lower, firstSelect, "gt") &&
          setParamValue(lower, numberParam, unitSecs(range[0], clause.unit)) &&
          setParamValue(upper, firstSelect, "lt") &&
          setParamValue(upper, numberParam, unitSecs(range[1], clause.unit));
        return ok
          ? ([["AND", leaf(lower), leaf(upper)] as LogicNode] as LogicElement[])
          : [];
      }

      const raw = clause.value;
      const n = typeof raw === "number" ? raw : raw != null ? Number(raw) : NaN;
      if (!Number.isFinite(n)) {
        unmatched.push(`${clause.id} requires numeric value`);
        return [];
      }
      const value = clause.id === "duration" ? toSeconds(n, clause.unit) : n;
      const out: Record<string, any> = {};
      const ok =
        setParamValue(out, firstSelect, operator) &&
        setParamValue(out, numberParam, value);
      return ok ? [leaf(out)] : [];
    }

    case "tokens": {
      const operator = clause.op ?? "gt";
      const raw = clause.value;
      const n = typeof raw === "number" ? raw : raw != null ? Number(raw) : NaN;
      if (!Number.isFinite(n)) {
        unmatched.push("tokens requires numeric value");
        return [];
      }
      // Figure out which select controls "field" and which controls "operator"
      const fieldParam =
        singleSelects.find((p: any) =>
          (p as any).options?.some((o: any) =>
            ["total", "prompt", "completion"].includes(String(o.value ?? o)),
          ),
        ) ?? firstSelect;

      const opParam =
        singleSelects.find((p: any) =>
          (p as any).options?.some((o: any) =>
            ["gt", "lt", "eq", "neq", "gte", "lte"].includes(
              String(o.value ?? o),
            ),
          ),
        ) ?? (fieldParam === firstSelect ? secondSelect : firstSelect);

      const out: Record<string, any> = {};
      const ok =
        setParamValue(out, fieldParam, clause.field ?? "total") &&
        setParamValue(out, opParam, operator) &&
        setParamValue(out, numberParam, n);
      return ok ? [leaf(out)] : [];
    }

    case "date": {
      const operator = clause.op ?? "gt";
      if (operator === "between") {
        const iso = clause.iso;
        const [start, end] = Array.isArray(iso) ? iso : [];
        if (!start || !end) {
          unmatched.push("date between requires two ISO datetimes");
          return [];
        }
        const lo: Record<string, any> = {};
        const hi: Record<string, any> = {};
        const ok =
          setParamValue(lo, firstSelect, "gt") &&
          setParamValue(lo, dateParam, start) &&
          setParamValue(hi, firstSelect, "lt") &&
          setParamValue(hi, dateParam, end);
        return ok
          ? ([["AND", leaf(lo), leaf(hi)] as LogicNode] as LogicElement[])
          : [];
      }

      const iso =
        typeof clause.iso === "string"
          ? clause.iso
          : String(clause.value ?? "");
      const out: Record<string, any> = {};
      const ok =
        setParamValue(out, firstSelect, operator) &&
        setParamValue(out, dateParam, iso);
      return ok ? [leaf(out)] : [];
    }

    case "feedback": {
      const values = buildFeedbackValues(clause.thumbs);
      if (!values.length) {
        unmatched.push("feedback requires at least one of up/down/null");
        return [];
      }
      const out: Record<string, any> = {};
      const ok = setParamValue(out, multiSelect, values);
      return ok ? [leaf(out)] : [];
    }

    case "status": {
      const v = clause.value ?? clause.values?.[0];
      if (!v) {
        unmatched.push("status requires a value");
        return [];
      }
      const out: Record<string, any> = {};
      const ok = setParamValue(out, firstSelect, v);
      return ok ? [leaf(out)] : [];
    }

    case "models":
    case "tags":
    case "templates": {
      const base =
        clause.values ?? (clause.value != null ? [String(clause.value)] : []);
      if (!base.length) {
        unmatched.push(`${clause.id} requires at least one value`);
        return [];
      }
      let allowedList: string[] = [];
      if (clause.id === "models") allowedList = allowed.models;
      if (clause.id === "tags") allowedList = allowed.tags;
      if (clause.id === "templates") allowedList = allowed.templates;

      const filtered = allowedList.length
        ? base.filter((v) => allowedList.includes(String(v)))
        : base;

      if (!filtered.length) {
        unmatched.push(`No allowed ${clause.id} matched: ${base.join(", ")}`);
        return [];
      }

      const out: Record<string, any> = {};
      const ok = setParamValue(out, multiSelect ?? firstSelect, filtered);
      return ok ? [leaf(out)] : [];
    }

    case "tools":
    case "retrievers": {
      const value =
        clause.value ??
        (Array.isArray(clause.values) ? clause.values[0] : undefined);
      if (!value) {
        unmatched.push(`${clause.id} requires a name`);
        return [];
      }
      const out: Record<string, any> = {};
      const ok = setParamValue(out, textParam, value);
      return ok ? [leaf(out)] : [];
    }

    case "languages": {
      const vals =
        clause.values ?? (clause.value != null ? [String(clause.value)] : []);
      if (!vals.length) {
        unmatched.push("languages requires at least one code");
        return [];
      }
      const out: Record<string, any> = {};
      if (clause.field) setParamValue(out, firstSelect, clause.field);
      const ok = setParamValue(out, multiSelect ?? firstSelect, vals);
      return ok ? [leaf(out)] : [];
    }

    case "topics":
    case "toxicity": {
      const out: Record<string, any> = {};
      if (clause.field) setParamValue(out, firstSelect, clause.field);
      const vals =
        clause.values ?? (clause.value != null ? [String(clause.value)] : []);
      const ok = vals.length
        ? setParamValue(out, multiSelect ?? firstSelect, vals)
        : true;
      return ok ? [leaf(out)] : [];
    }

    case "intents": {
      const vals =
        clause.values ?? (clause.value != null ? [String(clause.value)] : []);
      if (!vals.length) {
        unmatched.push("intents requires at least one value");
        return [];
      }
      const out: Record<string, any> = {};
      const ok = setParamValue(out, multiSelect ?? firstSelect, vals);
      return ok ? [leaf(out)] : [];
    }

    case "pii": {
      const v =
        clause.flag ??
        clause.values?.[0] ??
        (typeof clause.value === "string" ? clause.value : undefined) ??
        "true";
      const out: Record<string, any> = {};
      const ok = setParamValue(out, firstSelect, v);
      return ok ? [leaf(out)] : [];
    }

    case "metadata": {
      const key =
        clause.key ??
        (clause.values?.[0] != null ? String(clause.values[0]) : undefined);
      const value =
        clause.value ??
        (clause.values?.[1] != null ? clause.values[1] : undefined);
      if (!key || value == null) {
        unmatched.push("metadata requires key and value");
        return [];
      }
      const out: Record<string, any> = {};
      const ok =
        setParamValue(out, firstSelect, key) &&
        (setParamValue(out, textParam, value) ||
          setParamValue(out, numberParam, value));
      return ok ? [leaf(out)] : [];
    }

    case "users": {
      const vals =
        clause.values ?? (clause.value != null ? [String(clause.value)] : []);
      if (!vals.length) {
        unmatched.push("users requires at least one identifier");
        return [];
      }
      const out: Record<string, any> = {};
      const ok = setParamValue(out, usersParam, vals);
      return ok ? [leaf(out)] : [];
    }

    case "type": {
      const v = clause.value ?? clause.values?.[0];
      const out: Record<string, any> = {};
      const ok = setParamValue(out, firstSelect, v);
      return ok ? [leaf(out)] : [];
    }

    default:
      unmatched.push(`No compiler implemented for ${clause.id}`);
      return [];
  }
}

export function compilePlanToCheckLogic(
  plan: NormalizedPlan,
  allowed: {
    models: string[];
    tags: string[];
    templates: string[];
  } = { models: [], tags: [], templates: [] },
): { logic: CheckLogic; unmatched: string[] } {
  const unmatched = [...(plan.unmatched ?? [])];

  const top: LogicElement[] = [];

  const addCompiled = (c: NormalizedClause) => {
    const compiled = compileClause(c, unmatched, allowed);
    top.push(...compiled);
  };

  for (const c of plan.clauses) addCompiled(c);

  for (const g of plan.groups ?? []) {
    const elements: LogicElement[] = [];
    for (const c of g.clauses) {
      elements.push(...compileClause(c, unmatched, allowed));
    }
    if (elements.length) {
      top.push([g.op, ...elements] as LogicNode);
    }
  }

  const logic = (
    plan.op === "OR" && top.length > 1
      ? (["OR", ...top] as LogicNode)
      : (["AND", ...top] as LogicNode)
  ) as CheckLogic;

  return { logic, unmatched };
}

/* ------------------------------------------------------------------------------------------
 * 6) Public API
 * ----------------------------------------------------------------------------------------*/

export async function naturalLanguageToFilters(
  text: string,
  type: RunType,
  projectId: string,
): Promise<{
  logic: CheckLogic;
  query: string;
  details: {
    normalizedPlan: NormalizedPlan;
    unmatched: string[];
    availableModels: string[];
    availableTags: string[];
    availableTemplates: string[];
  };
}> {
  const runType: RunType = SUPPORTED_RUN_TYPES.has(type) ? type : "llm";

  // Load per-project dynamic values
  const projectOpts = await loadProjectOptions(projectId || undefined, runType);

  // Build tool schema with dynamic enumerations
  const specs = buildFilterSpecs(projectOpts, runType);

  // Ask the LLM to return a plan that respects the schema
  const normalizedPlan = await llmToNormalizedPlan(text, specs);

  // Compile to internal CheckLogic
  const { logic, unmatched } = compilePlanToCheckLogic(normalizedPlan, {
    models: projectOpts.models,
    tags: projectOpts.tags,
    templates: projectOpts.templates,
  });

  // Guarantee at least a type leaf if empty
  const activeLeaves = (logic as any[]).slice(1);
  let finalLogic: CheckLogic = logic;
  if (!activeLeaves.length) {
    finalLogic = ["AND"] as LogicNode;
  }

  const query = serializeLogic(finalLogic);

  return {
    logic: finalLogic,
    query,
    details: {
      normalizedPlan,
      unmatched,
      availableModels: projectOpts.models,
      availableTags: projectOpts.tags,
      availableTemplates: projectOpts.templates,
    },
  };
}
