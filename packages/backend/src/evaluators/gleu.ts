import { Run } from "shared";
import { parseMessages } from "./utils";

/**
 * Simple GLEU evaluator: geometric mean of unigram precision and recall.
 * Params: threshold (0-1)
 */
export async function evaluate(
  { input, output }: { input: unknown; output: unknown },
  params: { threshold: number },
) {
  const refs = parseMessages(input) || [];
  const hyps = parseMessages(output) || [];
  const score = computeGleu(refs, hyps);
  return { score, passed: score >= params.threshold };
}

function computeGleu(refs: string[], hyps: string[]): number {
  const refTokens = refs.join(" ").split(/\s+/).filter(Boolean);
  const hypTokens = hyps.join(" ").split(/\s+/).filter(Boolean);
  if (hypTokens.length === 0 || refTokens.length === 0) return 0;
  const refSet = new Set(refTokens);
  const matches = hypTokens.filter((w) => refSet.has(w)).length;
  const precision = matches / hypTokens.length;
  const recall = matches / refTokens.length;
  return Math.sqrt(precision * recall);
}
