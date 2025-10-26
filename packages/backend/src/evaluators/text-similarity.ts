import { Run } from "shared";
import { parseMessages } from "./utils";

type SimilarityMethod = "cosine" | "bleu" | "rouge" | "gleu" | "fuzzy";

interface TextSimilarityParams {
  method?: SimilarityMethod;
  reference?: string;
  threshold?: number;
}

interface TextSimilarityResult {
  method: SimilarityMethod;
  score: number;
  reference: string;
  threshold: number;
  passed: boolean;
}

const DEFAULT_METHOD: SimilarityMethod = "cosine";

export async function evaluate(
  run: Run,
  params: TextSimilarityParams,
): Promise<TextSimilarityResult> {
  const method = normalizeMethod(params.method);
  const reference =
    typeof params.reference === "string" && params.reference.trim().length
      ? params.reference
      : extractText(run.input);
  const hypothesis = extractText(run.output);
  const threshold = normalizeThreshold(params.threshold);

  const calculator = METHOD_HANDLERS[method];
  const score = calculator(reference, hypothesis);

  return {
    method,
    score,
    reference,
    threshold,
    passed: score >= threshold,
  };
}

function normalizeMethod(input?: string): SimilarityMethod {
  if (!input) return DEFAULT_METHOD;
  if (["cosine", "bleu", "rouge", "gleu", "fuzzy"].includes(input)) {
    return input as SimilarityMethod;
  }
  return DEFAULT_METHOD;
}

function normalizeThreshold(threshold?: number): number {
  if (typeof threshold !== "number" || Number.isNaN(threshold)) {
    return 0.5;
  }
  if (threshold < 0) return 0;
  if (threshold > 1) return 1;
  return threshold;
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

const METHOD_HANDLERS: Record<
  SimilarityMethod,
  (reference: string, hypothesis: string) => number
> = {
  cosine: computeCosine,
  bleu: (reference, hypothesis) =>
    computeBleu(tokenize(reference), tokenize(hypothesis)),
  rouge: (reference, hypothesis) =>
    computeRouge(tokenize(reference), tokenize(hypothesis)),
  gleu: (reference, hypothesis) =>
    computeGleu(tokenize(reference), tokenize(hypothesis)),
  fuzzy: computeFuzzy,
};

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function computeCosine(reference: string, hypothesis: string): number {
  const refTokens = tokenize(reference);
  const hypTokens = tokenize(hypothesis);
  if (!refTokens.length || !hypTokens.length) return 0;
  const freqRef: Record<string, number> = {};
  const freqHyp: Record<string, number> = {};
  refTokens.forEach((token) => {
    freqRef[token] = (freqRef[token] || 0) + 1;
  });
  hypTokens.forEach((token) => {
    freqHyp[token] = (freqHyp[token] || 0) + 1;
  });
  const allTokens = new Set([...refTokens, ...hypTokens]);
  let dot = 0;
  let magRef = 0;
  let magHyp = 0;
  allTokens.forEach((token) => {
    const x = freqRef[token] || 0;
    const y = freqHyp[token] || 0;
    dot += x * y;
    magRef += x * x;
    magHyp += y * y;
  });
  if (magRef === 0 || magHyp === 0) return 0;
  return dot / (Math.sqrt(magRef) * Math.sqrt(magHyp));
}

function computeBleu(refTokens: string[], hypTokens: string[]): number {
  if (!hypTokens.length) return 0;
  const refSet = new Set(refTokens);
  const matches = hypTokens.filter((token) => refSet.has(token)).length;
  return matches / hypTokens.length;
}

function computeRouge(refTokens: string[], hypTokens: string[]): number {
  if (!refTokens.length) return 0;
  const refSet = new Set(refTokens);
  const matches = hypTokens.filter((token) => refSet.has(token)).length;
  return matches / refTokens.length;
}

function computeGleu(refTokens: string[], hypTokens: string[]): number {
  if (!refTokens.length || !hypTokens.length) return 0;
  const refSet = new Set(refTokens);
  const matches = hypTokens.filter((token) => refSet.has(token)).length;
  const precision = matches / hypTokens.length;
  const recall = matches / refTokens.length;
  if (precision === 0 || recall === 0) return 0;
  return Math.sqrt(precision * recall);
}

function computeFuzzy(reference: string, hypothesis: string): number {
  const a = reference;
  const b = hypothesis;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 && lenB === 0) return 1;
  if (lenA === 0 || lenB === 0) return 0;
  const dp: number[][] = Array(lenA + 1)
    .fill(0)
    .map(() => Array(lenB + 1).fill(0));
  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;
  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  const dist = dp[lenA][lenB];
  const maxLen = Math.max(lenA, lenB);
  return (maxLen - dist) / maxLen;
}
