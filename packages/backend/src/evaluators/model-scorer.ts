import { Run } from "shared";
import { parseMessages } from "./utils";

interface ModelScorerParams {
  minScore?: number;
  maxScore?: number;
  prompt?: string;
  modelId?: string;
}

interface ModelScorerResult {
  score: number;
  minScore: number;
  maxScore: number;
  passed: boolean;
}

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 10;

export async function evaluate(
  run: Run,
  params: ModelScorerParams,
): Promise<ModelScorerResult> {
  const minScore = normalizeBound(params.minScore, DEFAULT_MIN);
  const maxScore = normalizeBound(params.maxScore, DEFAULT_MAX);
  const clampedMax = Math.max(maxScore, minScore);

  const outputText = extractText(run.output);
  const wordCount = countWords(outputText);
  const normalized = Math.tanh(wordCount / 100); // 0 - 1
  const score = minScore + (clampedMax - minScore) * normalized;
  const midpoint = minScore + (clampedMax - minScore) / 2;

  return {
    score,
    minScore,
    maxScore: clampedMax,
    passed: score >= midpoint,
  };
}

function normalizeBound(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value;
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

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
