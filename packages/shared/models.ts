import { LunaryProvidedModel } from "./providers";

export const MODELS: LunaryProvidedModel[] = [
  {
    id: "gpt-5",
    name: "gpt-5",
    provider: "openai",
  },
  {
    id: "gpt-5-mini",
    name: "gpt-5-mini",
    provider: "openai",
  },
  {
    id: "gpt-5-nano",
    name: "gpt-5-nano",
    provider: "openai",
  },
  {
    id: "gpt-5-thinking",
    name: "gpt-5-thinking",
    provider: "openai",
  },
  {
    id: "gpt-4.1",
    name: "gpt-4.1",
    provider: "openai",
  },
  {
    id: "gpt-4.1-mini",
    name: "gpt-4.1-mini",
    provider: "openai",
  },
  {
    id: "gpt-4.1-nano",
    name: "gpt-4.1-nano",
    provider: "openai",
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "openai",
  },
  {
    id: "o3-pro",
    name: "o3-pro",
    provider: "openai",
  },
  {
    id: "o3",
    name: "o3",
    provider: "openai",
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    provider: "openai",
  },
  {
    id: "gpt-4o",
    name: "gpt-4o",
    provider: "openai",
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    provider: "openai",
    // TODO: verify we can stream with o models
  },
  {
    id: "o1",
    name: "o1",
    provider: "openai",
  },
  {
    id: "o1-mini",
    name: "o1-mini",
    provider: "openai",
  },
  {
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
    provider: "openai",
  },
  {
    id: "gpt-4-turbo",
    name: "gpt-4-turbo",
    provider: "openai",
  },
  {
    id: "claude-opus-4-1",
    name: "claude-opus-4-1-20250805",
    provider: "anthropic",
  },
  {
    id: "claude-opus-4",
    name: "claude-opus-4-20250514",
    provider: "anthropic",
  },
  {
    id: "claude-sonnet-4",
    name: "claude-sonnet-4-20250514",
    provider: "anthropic",
  },
  {
    id: "claude-sonnet-4.5",
    name: "claude-sonnet-4.5",
    provider: "anthropic",
  },
  {
    id: "claude-haiku-4-5",
    name: "claude-haiku-4.5",
    provider: "anthropic",
  },
  {
    id: "claude-3-7-sonnet-latest",
    name: "claude-3-7-sonnet",
    provider: "anthropic",
  },
  {
    id: "claude-3-5-sonnet-20240620",
    name: "claude-3-5-sonnet",
    provider: "anthropic",
  },
  {
    id: "claude-3-opus-20240229",
    name: "claude-3-opus",
    provider: "anthropic",
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "claude-3-sonnet",
    provider: "anthropic",
  },
  {
    id: "claude-3-haiku-20240307",
    name: "claude-3-haiku",
    provider: "anthropic",
  },
  {
    id: "claude-3.5-haiku",
    name: "claude-3.5-haiku",
    provider: "anthropic",
  },
  {
    id: "gpt-4-turbo-2024-04-09",
    name: "gpt-4-turbo-2024-04-09",
    provider: "openai",
  },
  {
    id: "gpt-4-turbo-preview",
    name: "gpt-4-turbo-preview",
    provider: "openai",
  },
  { id: "gpt-4-1106-preview", name: "gpt-4-1106-preview", provider: "openai" },
  { id: "gpt-4-0125-preview", name: "gpt-4-0125-preview", provider: "openai" },
  { id: "gpt-4", name: "gpt-4", provider: "openai" },
  {
    id: "gpt-4o-2024-05-13",
    name: "gpt-4o-2024-05-13",
    provider: "openai",
  },
  {
    id: "gpt-4-vision-preview",
    name: "gpt-4-vision-preview",
    provider: "openai",
  },
  {
    id: "mistral",
    name: "magistral-medium-latest",
    provider: "mistral",
  },
  {
    id: "mistral-large-latest",
    name: "mistral-large",
    provider: "mistral",
  },
  {
    id: "mistral-medium-latest",
    name: "mistral-medium",
    provider: "mistral",
  },
  {
    id: "mistral-small-latest",
    name: "mistral-small",
    provider: "mistral",
  },
  {
    id: "open-mixtral-8x7b",
    name: "mixtral-8x7b",
    provider: "mistral",
  },
  {
    id: "open-mistral-7b",
    name: "mistral-7b",
    provider: "mistral",
  },
  { id: "gpt-3.5-turbo", name: "gpt-3.5-turbo", provider: "openai" },
  { id: "gpt-3.5-turbo-1106", name: "gpt-3.5-turbo-1106", provider: "openai" },
  { id: "gpt-3.5-turbo-0125", name: "gpt-3.5-turbo-0125", provider: "openai" },
  { id: "gpt-3.5-turbo-16k", name: "gpt-3.5-turbo-16k", provider: "openai" },
  {
    id: "google/gemma-3-1b-it:free",
    name: "gemma-3-1b-it",
    provider: "openrouter",
  },
  {
    id: "google/gemma-3-4b-it:free",
    name: "gemma-3-4b-it",
    provider: "openrouter",
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "gemma-3-12b-it",
    provider: "openrouter",
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "gemma-3-27b-it",
    provider: "openrouter",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "gemini-2.0-flash-001",
    provider: "openrouter",
  },
  {
    id: "google/gemini-2.0-pro-exp-02-05:free",
    name: "gemini-2.0-pro-exp-02-05",
    provider: "openrouter",
  },
  {
    id: "google/gemini-2.0-flash-thinking-exp-1219:free",
    name: "gemini-2.0-flash-thinking-exp-1219",
    provider: "openrouter",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "gemini-2.0-flash-exp",
    provider: "openrouter",
  },
  {
    id: "google/gemini-pro",
    name: "gemini-pro-1.0",
    provider: "openrouter",
  },
  {
    id: "google/gemini-pro-1.5",
    name: "gemini-pro-1.5",
    provider: "openrouter",
  },
  {
    id: "google/gemini-flash-1.5",
    name: "gemini-flash-1.5",
    provider: "openrouter",
  },
  {
    id: "google/gemini-flash-1.5-8b",
    name: "gemini-flash-1.5-8b",
    provider: "openrouter",
  },
  { id: "claude-2", name: "claude-2", provider: "anthropic" },
  {
    id: "claude-instant-v1",
    name: "claude-instant-v1",
    provider: "anthropic",
  },
  {
    id: "open-orca/mistral-7b-openorca",
    name: "mistral-7b-openorca",
    provider: "openrouter",
  },
  {
    id: "mistralai/mistral-7b-instruct",
    name: "mistral-7b-instruct",
    provider: "openrouter",
  },
  {
    id: "teknium/openhermes-2.5-mistral-7b",
    name: "openhermes-2.5-mistral-7b",
    provider: "openrouter",
  },
  {
    id: "perplexity/pplx-70b-chat",
    name: "pplx-70b-chat",
    provider: "openrouter",
  },
  {
    id: "perplexity/pplx-7b-chat",
    name: "pplx-7b-chat",
    provider: "openrouter",
  },
  {
    id: "openchat/openchat-7b",
    name: "openchat-7b",
    provider: "openrouter",
  },
  {
    id: "google/palm-2-chat-bison",
    name: "palm-2-chat-bison",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-2-13b-chat",
    name: "llama-2-13b-chat",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-2-70b-chat",
    name: "llama-2-70b-chat",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-3-8b-instruct",
    name: "llama-3-8b-instruct",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "llama-3.1-70b-instruct",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "llama-3.1-8b-instruct",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-3.2-1b-instruct",
    name: "llama-3.2-1b-instruct",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct",
    name: "llama-3.2-3b-instruct",
    provider: "openrouter",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "llama-3.3-70b-instruct",
    provider: "openrouter",
  },
  {
    id: "x-ai/grok-2",
    name: "grok-2",
    provider: "openrouter",
  },
  {
    id: "x-ai/grok-2-1212",
    name: "grok-2-1212",
    provider: "openrouter",
  },
  {
    id: "perplexity/llama-3.1-sonar-large-128k-online",
    name: "perplexity-llama-3.1-sonar-large-128k-online",
    provider: "openrouter",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "deepseek-r1",
    provider: "openrouter",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "deepseek-v3",
    provider: "openrouter",
  },
  {
    id: "microsoft/phi-4",
    name: "phi-4",
    provider: "openrouter",
  },
  {
    id: "ibm/granite-20b-code-instruct",
    name: "granite-20b-code-instruct",
    provider: "ibm-watsonx-ai",
  },
  {
    id: "ibm/granite-3-2b-instruct",
    name: "granite-3-2b-instruct",
    provider: "ibm-watsonx-ai",
  },
  {
    id: "ibm/granite-3-8b-instruct",
    name: "granite-3-8b-instruct",
    provider: "ibm-watsonx-ai",
  },
  {
    id: "ibm/granite-34b-code-instruct",
    name: "granite-34b-code-instruct",
    provider: "ibm-watsonx-ai",
  },
  {
    id: "sonar",
    name: "sonar",
    provider: "perplexity",
  },
  {
    id: "sonar-pro",
    name: "sonar-pro",
    provider: "perplexity",
  },
  {
    id: "sonar-reasoning",
    name: "sonar-reasoning",
    provider: "perplexity",
  },
];
