import { Run } from "shared";
import { parseMessages } from "./utils";

/**
 * Simple Fuzzy Match evaluator using Levenshtein distance ratio.
 * Params: threshold (0-1)
 */
export async function evaluate(
  { input, output }: { input: unknown; output: unknown },
  params: { threshold: number },
) {
  const refs = parseMessages(input) || [];
  const hyps = parseMessages(output) || [];
  const score = computeFuzzy(refs.join(" "), hyps.join(" "));
  return { score, passed: score >= params.threshold };
}

function computeFuzzy(refText: string, hypText: string): number {
  const a = refText;
  const b = hypText;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 && lenB === 0) return 1;
  if (lenA === 0 || lenB === 0) return 0;
  // Levenshtein distance
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
