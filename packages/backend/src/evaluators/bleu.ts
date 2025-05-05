import { Run } from "shared";
import { parseMessages } from "./utils";

/**
 * Simple BLEU evaluator based on unigram precision.
 * Params: threshold (0-1)
 */
export async function evaluate(
  { input, output }: { input: unknown; output: unknown },
  params: { threshold: number },
) {
  const refs = parseMessages(input) || [];
  const hyps = parseMessages(output) || [];
  const score = computeBleu(refs, hyps);
  return { score, passed: score >= params.threshold };
}

function computeBleu(refs: string[], hyps: string[]): number {
  const refTokens = refs.join(" ").split(/\s+/).filter(Boolean);
  const hypTokens = hyps.join(" ").split(/\s+/).filter(Boolean);
  if (hypTokens.length === 0) return 0;
  const refSet = new Set(refTokens);
  const matches = hypTokens.filter((w) => refSet.has(w)).length;
  return matches / hypTokens.length;
}
