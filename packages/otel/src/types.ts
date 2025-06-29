/**
 * OpenTelemetry – Semantic Conventions for Generative AI (GenAI)
 * Version 1.34.0  —  Interface generated 2025‑06‑29
 */

/////////////////////////////
// Enumerated helper types //
/////////////////////////////

export type GenAIOperationName =
  | "chat"
  | "create_agent"
  | "embeddings"
  | "execute_tool"
  | "generate_content"
  | "invoke_agent"
  | "text_completion"
  | string;

export type GenAIOutputType = "image" | "json" | "speech" | "text" | string;

export type GenAISystem =
  | "anthropic"
  | "aws.bedrock"
  | "az.ai.inference"
  | "az.ai.openai"
  | "cohere"
  | "deepseek"
  | "gcp.gemini"
  | "gcp.gen_ai"
  | "gcp.vertex_ai"
  | "groq"
  | "ibm.watsonx.ai"
  | "mistral_ai"
  | "openai"
  | "perplexity"
  | "xai"
  | string;

export type GenAITokenType = "input" | "output" | string;

export type GenAIToolType = "function" | "extension" | "datastore" | string;

export type OpenAIServiceTierRequest = "auto" | "default" | string;
export type OpenAIServiceTierResponse = "scale" | "default" | string;

export type OpenAIResponseFormat =
  | "text"
  | "json_object"
  | "json_schema"
  | string;

///////////////////////////
// Main attribute record //
///////////////////////////

/**
 * Complete set of OTEL GenAI attributes.
 * Keys exactly match the **dotted attribute names** from the spec so that
 * they can be sent directly to an OTEL SDK without translation.
 */
export interface GenAIAttributes {
  /* ------------------------- GenAI core attributes ------------------------ */

  /** Free‑form description of the GenAI agent. */
  "gen_ai.agent.description"?: string;
  /** Unique identifier of the GenAI agent. */
  "gen_ai.agent.id"?: string;
  /** Human‑readable name of the GenAI agent. */
  "gen_ai.agent.name"?: string;

  /** Conversation / session identifier. */
  "gen_ai.conversation.id"?: string;

  /** Identifier of a RAG or other data source. */
  "gen_ai.data_source.id"?: string;

  /** Name of the operation being performed (chat, embeddings, …). */
  "gen_ai.operation.name"?: GenAIOperationName;

  /** Output modality requested by the client. */
  "gen_ai.output.type"?: GenAIOutputType;

  /** Target number of candidate completions to return. */
  "gen_ai.request.choice.count"?: number;
  /** Encoding / embedding formats requested. */
  "gen_ai.request.encoding_formats"?: string[];
  /** Frequency‑penalty parameter. */
  "gen_ai.request.frequency_penalty"?: number;
  /** Maximum tokens allowed in the response. */
  "gen_ai.request.max_tokens"?: number;
  /** Model name requested. */
  "gen_ai.request.model"?: string;
  /** Presence‑penalty parameter. */
  "gen_ai.request.presence_penalty"?: number;
  /** Deterministic random seed. */
  "gen_ai.request.seed"?: number;
  /** Stop sequences. */
  "gen_ai.request.stop_sequences"?: string[];
  /** Temperature parameter. */
  "gen_ai.request.temperature"?: number;
  /** Top‑k sampling parameter. */
  "gen_ai.request.top_k"?: number;
  /** Top‑p (nucleus) sampling parameter. */
  "gen_ai.request.top_p"?: number;

  /** Reasons the model stopped generating (aligned with each choice). */
  "gen_ai.response.finish_reasons"?: string[];
  /** Unique identifier for the model’s response. */
  "gen_ai.response.id"?: string;
  /** Model that actually produced the response. */
  "gen_ai.response.model"?: string;

  /** GenAI product family (OpenAI, Anthropic, …). */
  "gen_ai.system"?: GenAISystem;

  /** Whether counted tokens are from the prompt or the completion. */
  "gen_ai.token.type"?: GenAITokenType;

  /** Identifier for a tool call made by the agent. */
  "gen_ai.tool.call.id"?: string;
  /** Description of the tool. */
  "gen_ai.tool.description"?: string;
  /** Name of the tool. */
  "gen_ai.tool.name"?: string;
  /** Category of tool (function, extension, datastore). */
  "gen_ai.tool.type"?: GenAIToolType;

  /** Tokens in the input prompt. */
  "gen_ai.usage.input_tokens"?: number;
  /** Tokens in the generated output. */
  "gen_ai.usage.output_tokens"?: number;

  // Allow additional attributes for flexibility
  [key: string]: unknown;

  /* --------------------------- OpenAI extensions -------------------------- */

  /** Service tier requested (auto, default, …). */
  "gen_ai.openai.request.service_tier"?: OpenAIServiceTierRequest;
  /** Service tier actually used by OpenAI (scale, default, …). */
  "gen_ai.openai.response.service_tier"?: OpenAIServiceTierResponse;
  /** Fingerprint of the OpenAI back‑end environment. */
  "gen_ai.openai.response.system_fingerprint"?: string;

  /* ------------------------- Deprecated attributes ------------------------ */

  /** @deprecated  Use Event API for contents instead. */
  "gen_ai.completion"?: string;
  /** @deprecated  Use Event API for contents instead. */
  "gen_ai.prompt"?: string;
  /** @deprecated  Replaced by gen_ai.usage.output_tokens. */
  "gen_ai.usage.completion_tokens"?: number;
  /** @deprecated  Replaced by gen_ai.usage.input_tokens. */
  "gen_ai.usage.prompt_tokens"?: number;

  /** @deprecated  Superseded by gen_ai.output.type. */
  "gen_ai.openai.request.response_format"?: OpenAIResponseFormat;
  /** @deprecated  Superseded by gen_ai.request.seed. */
  "gen_ai.openai.request.seed"?: number;
}
