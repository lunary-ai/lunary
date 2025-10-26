export const BUILTIN_EVALUATOR_TYPES = [
  "language",
  "pii",
  "topics",
  "intent",
  "toxicity",
] as const;

export type BuiltinEvaluatorType = (typeof BUILTIN_EVALUATOR_TYPES)[number];
