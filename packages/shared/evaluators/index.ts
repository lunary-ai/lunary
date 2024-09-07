export type EvaluatorType =
  | "pii"
  | "summarization"
  | "sentiment"
  | "language"
  | "toxicity"
  | "assertion"
  | "topics"
  | "tone"
  | "factualness"
  | "geval"
  | "guidelines"
  | "replies";
export type EvaluatorMode = "normal" | "realtime";

interface BaseEvaluator {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  ownerId?: string;
  name: string;
  slug: string;
  description?: string;
  type: EvaluatorType;
  mode: EvaluatorMode;
  params: any; // TODO
}

interface NormalEvaluator extends BaseEvaluator {
  mode: "normal";
}

export interface RealtimeEvaluator extends BaseEvaluator {
  mode: "realtime";
  filters: any; // TODO
}

type Evaluator = NormalEvaluator | RealtimeEvaluator;

interface BaseLanguageDetectionResult {
  isoCode: string;
  confidence: number;
}

export type EnrichmentData = {
  input: Array<Record<string, any>>;
  output: Array<Record<string, any>>;
  error: Array<Record<string, any>>;
};

export type LanguageDetectionResult = EnrichmentData & {
  input: Array<BaseLanguageDetectionResult | null>;
  output: Array<BaseLanguageDetectionResult | null>;
  error: Array<BaseLanguageDetectionResult | null>;
};

export type AssertionResult = {
  result: boolean;
  reason: string;
};
