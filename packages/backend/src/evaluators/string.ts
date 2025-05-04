import { Run } from "shared";
import { parseMessages } from "./utils";

/**
 * String Comparator evaluator: compares output text to a target string.
 * Params: comparator (equals|not_equals|contains|contains_ignore_case), target string
 */
export async function evaluate(
  { input, output }: { input: unknown; output: unknown },
  params: { comparator: string; target: string },
) {
  const hyps = parseMessages(output) || [];
  const text = hyps.join(" ");
  const { comparator, target } = params;
  let passed = false;

  switch (comparator) {
    case "equals":
      passed = text === target;
      break;
    case "not_equals":
      passed = text !== target;
      break;
    case "contains":
      passed = text.includes(target);
      break;
    case "contains_ignore_case":
      passed = text.toLowerCase().includes(target.toLowerCase());
      break;
    default:
      passed = false;
  }

  return { passed };
}
