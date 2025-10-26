import openai from "@/src/utils/openai";
import sql from "@/src/utils/db";
import { Run } from "shared";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

type NormalizedMessage = {
  role: string;
  content: string;
};

const OUTPUT_SCHEMA = z.object({
  intents: z
    .array(
      z.object({
        label: z.string().min(1),
        confidence: z.number().min(0).max(1),
        rationale: z.string().optional().default(""),
      }),
    )
    .min(1),
  summary: z.string().optional().default(""),
});

type ParsedIntentPayload = z.infer<typeof OUTPUT_SCHEMA>;

const CONVERSATION_CHAR_LIMIT = 12000;

function ensureClient() {
  if (!openai) {
    throw new Error("OpenAI client is not configured");
  }
  return openai;
}

function flattenMessages(payload: unknown): any[] {
  if (!payload || payload === "__NOT_INGESTED__") {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [payload];
}

function coerceContent(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }
        if (
          entry &&
          typeof entry === "object" &&
          "text" in entry &&
          typeof (entry as any).text === "string"
        ) {
          return (entry as any).text;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
    return joined.length ? joined : null;
  }

  if (typeof value === "object") {
    if ("content" in (value as Record<string, unknown>)) {
      return coerceContent((value as Record<string, unknown>).content);
    }
    if ("text" in (value as Record<string, unknown>)) {
      return coerceContent((value as Record<string, unknown>).text);
    }
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized.length ? serialized : null;
  } catch {
    return null;
  }
}

function normalizeMessage(raw: any): NormalizedMessage | null {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    // Some providers wrap content as array, grab first meaningful value
    for (const item of raw) {
      const normalized = normalizeMessage(item);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  }

  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text.length) return null;
    return {
      role: "unknown",
      content: text,
    };
  }

  if (typeof raw === "object") {
    const role =
      typeof raw.role === "string" && raw.role.length ? raw.role : "unknown";
    const content =
      coerceContent(raw.content) ??
      coerceContent(raw.message) ??
      coerceContent(raw.value);

    if (content && content.length) {
      return { role, content };
    }

    const serialized = coerceContent(raw);
    if (serialized) {
      return { role, content: serialized };
    }
  }

  return null;
}

async function loadThreadMessages(run: Run): Promise<NormalizedMessage[]> {
  const baseMessages = [
    ...flattenMessages(run.input),
    ...flattenMessages(run.output),
  ]
    .map(normalizeMessage)
    .filter(Boolean) as NormalizedMessage[];

  const rows = await sql<{ msg: any }[]>`
    with thread_messages as (
      select
        child.created_at,
        msg
      from
        run child
        cross join lateral jsonb_array_elements(coalesce(child.input, '[]'::jsonb)) as msg
      where
        child.parent_run_id = ${run.id}
        and child.type = 'chat'

      union all

      select
        child.created_at,
        msg
      from
        run child
        cross join lateral jsonb_array_elements(coalesce(child.output, '[]'::jsonb)) as msg
      where
        child.parent_run_id = ${run.id}
        and child.type = 'chat'
    )
    select
      msg
    from
      thread_messages
    order by
      created_at asc
  `;

  const nested = rows
    .map((row) => normalizeMessage(row.msg))
    .filter(Boolean) as NormalizedMessage[];

  const merged = [...baseMessages, ...nested];

  // Deduplicate consecutive identical entries
  return merged.filter((message, index) => {
    if (index === 0) return true;
    const previous = merged[index - 1];
    return !(
      previous.role === message.role && previous.content === message.content
    );
  });
}

function buildConversationPlaintext(messages: NormalizedMessage[]): string {
  if (!messages.length) {
    return "";
  }

  const lines = messages.map(
    (message, index) =>
      `${index + 1}. ${message.role.toUpperCase()}: ${message.content}`,
  );

  const full = lines.join("\n\n");
  if (full.length <= CONVERSATION_CHAR_LIMIT) {
    return full;
  }

  const trimmed: string[] = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const candidate = lines[i];
    total += candidate.length + 2;
    if (total > CONVERSATION_CHAR_LIMIT && trimmed.length) {
      break;
    }
    trimmed.push(candidate);
  }

  trimmed.reverse();
  return trimmed.join("\n\n");
}

function normalizePayload(payload: ParsedIntentPayload) {
  const humanizeLabel = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed.length) return trimmed;

    const hasSeparators = /[_-]/.test(trimmed);
    const candidate = trimmed
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!candidate.length) return trimmed;
    if (!hasSeparators && /\s/.test(trimmed)) {
      return candidate;
    }

    return candidate
      .split(" ")
      .map((word) =>
        word
          ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          : word,
      )
      .join(" ");
  };

  const intents = payload.intents
    .map((intent) => ({
      label: humanizeLabel(intent.label),
      confidence: Math.min(Math.max(intent.confidence, 0), 1),
      rationale: intent.rationale?.trim() || undefined,
    }))
    .filter((intent) => intent.label.length);

  return {
    intents,
    summary: payload.summary?.trim() || undefined,
  };
}

export async function evaluate(run: Run) {
  if (run.type !== "thread") {
    return null;
  }

  const client = ensureClient();
  const conversation = await loadThreadMessages(run);

  if (!conversation.length) {
    return null;
  }

  const conversationText = buildConversationPlaintext(conversation);
  if (!conversationText.length) {
    return null;
  }

  try {
    const completion = await client.responses.parse({
      model: "gpt-5-nano",
      instructions: `
You are an enterprise support analyst performing intent detection on user conversations.

Analyze the full conversation provided in the input. Identify every distinct goal the end user (role "USER" or "CUSTOMER") tries to achieve.

Return JSON with:
- intents: array of objects { label, confidence, rationale? } where confidence is 0-1.
- summary: optional concise description (<= 200 chars) of what the user is trying to accomplish overall.

Do not invent intents that are not grounded in the conversation. Group repeated requests under the same label.
`,
      input: conversationText,
      text: {
        format: zodTextFormat(OUTPUT_SCHEMA, "intent_detection"),
      },
    });

    if (!completion.output_parsed) {
      throw new Error("Failed to parse intent detection response");
    }

    const normalized = normalizePayload(completion.output_parsed);
    if (!normalized.intents.length) {
      return null;
    }

    return {
      input: [
        {
          intents: normalized.intents,
          summary: normalized.summary,
        },
      ],
      output: [],
      error: [],
    };
  } catch (error) {
    console.error(
      `Intent evaluator failed for run ${run.id}: ${(error as Error).message}`,
    );
    return null;
  }
}
