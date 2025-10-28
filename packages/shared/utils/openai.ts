type MaybeModelIdentifier =
  | string
  | null
  | undefined
  | { id?: string; name?: string; model?: string };

function normalizeModelId(model: MaybeModelIdentifier): string {
  if (!model) return "";
  if (typeof model === "string") return model;
  if (typeof model === "object") {
    if (typeof model.id === "string") return model.id;
    if (typeof model.model === "string") return model.model;
    if (typeof model.name === "string") return model.name;
  }
  return String(model);
}

export function shouldUseMaxCompletionTokens(modelId?: MaybeModelIdentifier) {
  const normalized = normalizeModelId(modelId).toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("gpt-5") ||
    normalized.startsWith("gpt-4.1") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4")
  );
}

export function getMaxTokenParam(
  modelId: MaybeModelIdentifier,
  maxTokens: number | null | undefined,
) {
  if (maxTokens === undefined || maxTokens === null) {
    return {};
  }

  return shouldUseMaxCompletionTokens(modelId)
    ? { max_completion_tokens: maxTokens }
    : { max_tokens: maxTokens };
}

const FIXED_TEMPERATURE_MODELS = [/gpt-5/];

const OPENAI_THINKING_MODELS = [/gpt-5/, /^o\d/];
const OPENAI_REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high"] as const;

const ANTHROPIC_THINKING_MODELS = [
  /claude-opus-4/,
  /claude-sonnet-4/,
  /claude-haiku-4-5/,
  /claude-3-7-sonnet/,
  /claude-3-5-sonnet/,
  /claude-3\.5-sonnet/,
  /claude-3\.5-haiku/,
] as const;

export const FIXED_TEMPERATURE_VALUE = 1;

export function requiresFixedTemperature(modelId?: MaybeModelIdentifier) {
  const normalized = normalizeModelId(modelId).toLowerCase();
  if (!normalized) return false;

  return FIXED_TEMPERATURE_MODELS.some((pattern) =>
    typeof pattern === "string" ? pattern === normalized : pattern.test(normalized),
  );
}

export function normalizeTemperature(
  modelId: MaybeModelIdentifier,
  temperature: number | null | undefined,
) {
  const normalizedId = normalizeModelId(modelId);
  if (!normalizedId) return temperature ?? undefined;

  if (requiresFixedTemperature(normalizedId)) {
    return FIXED_TEMPERATURE_VALUE;
  }

  return temperature ?? undefined;
}

export type OpenAIReasoningEffort = (typeof OPENAI_REASONING_EFFORTS)[number];

export function supportsOpenAIThinking(modelId?: MaybeModelIdentifier) {
  const normalized = normalizeModelId(modelId).toLowerCase();
  if (!normalized) return false;
  return OPENAI_THINKING_MODELS.some((pattern) => pattern.test(normalized));
}

export function normalizeOpenAIReasoningEffort(
  modelId: MaybeModelIdentifier,
  effort: OpenAIReasoningEffort | null | undefined,
) {
  if (!supportsOpenAIThinking(modelId)) return undefined;
  if (!effort || effort === "none") return undefined;
  return effort;
}

export function getOpenAIReasoningEfforts(): OpenAIReasoningEffort[] {
  return [...OPENAI_REASONING_EFFORTS];
}

export interface AnthropicThinkingConfig {
  type: "disabled" | "enabled";
  budget_tokens?: number | null;
}

export function supportsAnthropicThinking(modelId?: MaybeModelIdentifier) {
  const normalized = normalizeModelId(modelId).toLowerCase();
  if (!normalized) return false;
  return ANTHROPIC_THINKING_MODELS.some((pattern) => pattern.test(normalized));
}

export function normalizeAnthropicThinking(
  modelId: MaybeModelIdentifier,
  thinking: AnthropicThinkingConfig | null | undefined,
) {
  if (!supportsAnthropicThinking(modelId) || !thinking) return undefined;
  if (thinking.type !== "enabled") {
    return { type: "disabled" as const };
  }

  const budget = thinking.budget_tokens;
  return {
    type: "enabled" as const,
    budget_tokens: typeof budget === "number" && budget > 0 ? budget : undefined,
  };
}
