import { Run } from "shared";
import { parseMessages } from "./utils";

interface ModelLabelerParams {
  labels?: string[];
  prompt?: string;
  modelId?: string;
}

interface ModelLabelerResult {
  labels: string[];
  matches: string[];
  primaryLabel: string | null;
  passed: boolean;
}

export async function evaluate(
  run: Run,
  params: ModelLabelerParams,
): Promise<ModelLabelerResult> {
  const labels = normalizeLabels(params.labels);
  const outputText = extractText(run.output).toLowerCase();

  const matches = labels.filter((label) =>
    outputText.includes(label.toLowerCase()),
  );

  return {
    labels,
    matches,
    primaryLabel: matches[0] ?? null,
    passed: matches.length > 0,
  };
}

function normalizeLabels(input?: string[]): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((label) => (typeof label === "string" ? label.trim() : ""))
    .filter(Boolean);
}

function extractText(source: unknown): string {
  if (typeof source === "string") return source;
  const messages = parseMessages(source);
  if (messages && messages.length) {
    return messages.join(" ");
  }
  if (Array.isArray(source)) {
    return source
      .map((item) =>
        typeof item === "string" ? item : JSON.stringify(item ?? ""),
      )
      .join(" ");
  }
  if (source == null) return "";
  if (typeof source === "object") {
    return JSON.stringify(source);
  }
  return String(source);
}
