import { Run } from "shared";
import { parseMessages } from "./utils";

/**
 * Simple Cosine Similarity evaluator using term-frequency vectors.
 * Params: threshold (0-1)
 */
export async function evaluate(
  { input, output }: { input: unknown; output: unknown },
  params: { threshold: number },
) {
  const refs = parseMessages(input) || [];
  const hyps = parseMessages(output) || [];
  const score = computeCosine(refs.join(" "), hyps.join(" "));
  return { score, passed: score >= params.threshold };
}

function computeCosine(refText: string, hypText: string): number {
  const refTokens = refText.split(/\s+/).filter(Boolean);
  const hypTokens = hypText.split(/\s+/).filter(Boolean);
  const freqRef: Record<string, number> = {};
  const freqHyp: Record<string, number> = {};
  refTokens.forEach((w) => (freqRef[w] = (freqRef[w] || 0) + 1));
  hypTokens.forEach((w) => (freqHyp[w] = (freqHyp[w] || 0) + 1));
  const allTokens = new Set([...refTokens, ...hypTokens]);
  let dot = 0,
    magRef = 0,
    magHyp = 0;
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
