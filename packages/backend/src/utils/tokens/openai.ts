import { TiktokenEncoding } from "tiktoken";

const MODEL_TO_ENCODING: Record<string, TiktokenEncoding> = {
  // chat
  "gpt-4o": "o200k_base",
  "gpt-4": "cl100k_base",
  "gpt-3.5-turbo": "cl100k_base",
  "gpt-3.5": "cl100k_base", // Common shorthand
  "gpt-35-turbo": "cl100k_base", // Azure deployment name
  // base
  "davinci-002": "cl100k_base",
  "babbage-002": "cl100k_base",
  // embeddings
  "text-embedding-ada-002": "cl100k_base",
  "text-embedding-3-small": "cl100k_base",
  "text-embedding-3-large": "cl100k_base",

  // DEPRECATED MODELS
  // text (DEPRECATED)
  "text-davinci-003": "p50k_base",
  "text-davinci-002": "p50k_base",
  "text-davinci-001": "r50k_base",
  "text-curie-001": "r50k_base",
  "text-babbage-001": "r50k_base",
  "text-ada-001": "r50k_base",
  davinci: "r50k_base",
  curie: "r50k_base",
  babbage: "r50k_base",
  ada: "r50k_base",
  // code (DEPRECATED)
  "code-davinci-002": "p50k_base",
  "code-davinci-001": "p50k_base",
  "code-cushman-002": "p50k_base",
  "code-cushman-001": "p50k_base",
  "davinci-codex": "p50k_base",
  "cushman-codex": "p50k_base",
  // edit (DEPRECATED)
  "text-davinci-edit-001": "p50k_edit",
  "code-davinci-edit-001": "p50k_edit",
  // old embeddings (DEPRECATED)
  "text-similarity-davinci-001": "r50k_base",
  "text-similarity-curie-001": "r50k_base",
  "text-similarity-babbage-001": "r50k_base",
  "text-similarity-ada-001": "r50k_base",
  "text-search-davinci-doc-001": "r50k_base",
  "text-search-curie-doc-001": "r50k_base",
  "text-search-babbage-doc-001": "r50k_base",
  "text-search-ada-doc-001": "r50k_base",
  "code-search-babbage-code-001": "r50k_base",
  "code-search-ada-code-001": "r50k_base",
  // open source
  gpt2: "gpt2",
  "gpt-2": "gpt2", // Maintains consistency with gpt-4
};

const MODEL_PREFIX_TO_ENCODING: Record<string, TiktokenEncoding> = {
  // chat
  "gpt-4o-": "o200k_base", // e.g., gpt-4o-2024-05-13
  "gpt-4-": "cl100k_base", // e.g., gpt-4-0314, etc., plus gpt-4-32k
  "gpt-3.5-turbo-": "cl100k_base", // e.g, gpt-3.5-turbo-0301, -0401, etc.
  "gpt-35-turbo-": "cl100k_base", // Azure deployment name

  // fine-tuned
  "ft:gpt-4o": "o200k_base",
  "ft:gpt-4": "cl100k_base",
  "ft:gpt-3.5-turbo": "cl100k_base",
  "ft:davinci-002": "cl100k_base",
  "ft:babbage-002": "cl100k_base",
};

/**
 * Checks if the given model name is a recognized OpenAI model.
 */
export function isOpenAIModelName(modelName: string): boolean {
  if (modelName in MODEL_TO_ENCODING) {
    return true;
  }
  for (const modelPrefix of Object.keys(MODEL_PREFIX_TO_ENCODING)) {
    if (modelName.startsWith(modelPrefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Gets the encoding name for a recognized OpenAI model.
 * Throws an error if the input is not a recognized OpenAI model.
 */
export function getEncodingNameForOpenAIModel(
  modelName: string,
): TiktokenEncoding {
  if (modelName in MODEL_TO_ENCODING) {
    return MODEL_TO_ENCODING[modelName];
  }
  for (const [modelPrefix, encoding] of Object.entries(
    MODEL_PREFIX_TO_ENCODING,
  )) {
    if (modelName.startsWith(modelPrefix)) {
      return encoding;
    }
  }

  return "cl100k_base";
}
