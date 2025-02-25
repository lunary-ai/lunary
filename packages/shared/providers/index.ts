type ProviderName =
  | "openai"
  | "azure_openai"
  | "amazon_bedrock"
  | "google_ai_studio"
  | "google_vertex"
  | "anthropic"
  | "x_ai";

/**
 * A provider is the service that provides access to a LLM model via an API.
 * For example, OpenAI, Anthropic, etc.
 */
export interface ProviderMetadata {
  name: ProviderName;
  displayName:
    | "OpenAI"
    | "Azure OpenAI"
    | "Amazon Bedrock"
    | "Google AI Studio"
    | "Google Vertex"
    | "Anthropic"
    | "X AI";
  apiUrl: string;
  iconUrl: string;
  description: string;
  disabled?: boolean;
}

export interface ProviderConfig {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  providerName: string;
  apiKey: string;
  extraConfig?: Record<string, any>;
  // TODO: type properly the config field depending on the provider
}

export interface ConfiguredProvider {
  metadata: ProviderMetadata;
  config?: ProviderConfig;
}
export interface CustomModel {
  id: string;
  name: string;
  providerId: string;
  provider: string;
}

/**
 * The organization that builds models. They do not necessarily are providers, env though they often are.
 */
interface FoundationalModelDeveloper {}

export const PROVIDERS: ProviderMetadata[] = [
  {
    name: "openai",
    displayName: "OpenAI",
    apiUrl: "https://api.openai.com",
    iconUrl: "https://openai.com/favicon.ico",
    description: "Provides access to OpenAI models and services.",
  },
  {
    name: "azure_openai",
    displayName: "Azure OpenAI",
    apiUrl: "https://api.azure.com/openai",
    iconUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg",
    description: "Microsoft Azure's implementation of OpenAI.",
  },
  {
    name: "amazon_bedrock",
    displayName: "Amazon Bedrock",
    apiUrl: "https://api.amazon.com/bedrock",
    iconUrl:
      "https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/bedrock-color.png",
    description: "AWS service providing access to LLM models.",
    disabled: true,
  },
  {
    name: "google_ai_studio",
    displayName: "Google AI Studio",
    apiUrl: "https://api.google.com/ai-studio",
    iconUrl: "https://ai.google/favicon.ico",
    description: "Google's AI Studio platform for LLM models.",
    disabled: true,
  },
  {
    name: "google_vertex",
    displayName: "Google Vertex",
    apiUrl: "https://api.google.com/vertex",
    iconUrl:
      "https://cdn.prod.website-files.com/65264f6bf54e751c3a776db1/66d86886a6dc58ed59b15d41_vertex.png",
    description: "Google Vertex AI for machine learning models.",
    disabled: true,
  },
  {
    name: "anthropic",
    displayName: "Anthropic",
    apiUrl: "https://api.anthropic.com",
    iconUrl: "https://anthropic.com/favicon.ico",
    description: "Anthropic's platform for LLM model access.",
    disabled: true,
  },
  {
    name: "x_ai",
    displayName: "X AI",
    apiUrl: "https://api.x.ai",
    iconUrl: "https://x.ai/favicon.ico",
    description: "X AI provides access to LLM models.",
    disabled: true,
  },
];
