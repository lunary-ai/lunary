export function shouldUseMaxCompletionTokens(modelId?: string | null) {
  if (!modelId) return false;

  const normalized = modelId.toLowerCase();

  return (
    normalized.includes("gpt-5") ||
    normalized.startsWith("gpt-4.1") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4")
  );
}

export function getMaxTokenParam(
  modelId: string | undefined,
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

export const FIXED_TEMPERATURE_VALUE = 1;

export function requiresFixedTemperature(modelId?: string | null) {
  if (!modelId) return false;
  const normalized = modelId.toLowerCase();

  return FIXED_TEMPERATURE_MODELS.some((pattern) =>
    typeof pattern === "string" ? pattern === normalized : pattern.test(normalized),
  );
}

export function normalizeTemperature(
  modelId: string | undefined,
  temperature: number | null | undefined,
) {
  if (!modelId) return temperature ?? undefined;

  if (requiresFixedTemperature(modelId)) {
    return FIXED_TEMPERATURE_VALUE;
  }

  return temperature ?? undefined;
}
