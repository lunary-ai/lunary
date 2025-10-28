import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import Anthropic from "@anthropic-ai/sdk";
import { generateText } from "ai";
import OpenAI, { AzureOpenAI } from "openai";
import {
  MODELS,
  Model,
  getMaxTokenParam,
  normalizeAnthropicThinking,
  normalizeOpenAIReasoningEffort,
  normalizeTemperature,
} from "shared";
import { ReadableStream } from "stream/web";
import sql from "./db";
import watsonxAi from "./ibm";
import { clearUndefined } from "./ingest";
import { getOpenAIParams } from "./openai";
import stripe from "./stripe";

function convertInputToOpenAIMessages(input: any[]) {
  return input.map(
    ({ toolCallId, role, content, text, functionCall, toolCalls, name }) => {
      return clearUndefined({
        role: role
          .replace("ai", "assistant")
          .replace("AIMessageChunk", "assistant"),
        content: content || text,
        function_call: functionCall || undefined,
        tool_calls: toolCalls || undefined,
        name: name || undefined,
        tool_call_id: toolCallId || undefined,
      });
    },
  );
}

type ChunkResult = {
  choices: { message: any }[];
  usage: {
    completion_tokens: number;
  };
};

const checkIsAsyncIterable = (obj: any) => {
  return obj && typeof obj[Symbol.asyncIterator] === "function";
};

export async function handleStream(
  stream: ReadableStream,
  onNewToken: (data: ChunkResult) => void,
  onComplete: () => void,
  onError: (e: Error) => void,
) {
  try {
    if (!checkIsAsyncIterable(stream)) {
      onNewToken(stream);
      return onComplete();
    }

    let tokens = 0;
    let choices: any[] = [];
    let res: ChunkResult;

    for await (const part of stream) {
      // 1 chunk = 1 token
      tokens += 1;

      const chunk = part.choices[0];
      if (!chunk) continue; // Happens with AzureOpenai for first element

      const { index, delta } = chunk;

      const { content, function_call, role, tool_calls, tool_call_id } = delta;

      if (!choices[index]) {
        choices.splice(index, 0, {
          message: { role, function_call },
        });
      }

      if (content) {
        if (!choices[index].message.content)
          choices[index].message.content = "";
        choices[index].message.content += content;
      }

      if (role) choices[index].message.role = role;

      if (tool_call_id) choices[index].message.tool_call_id = tool_call_id;

      if (function_call?.name)
        choices[index].message.function_call.name = function_call.name;

      if (function_call?.arguments)
        choices[index].message.function_call.arguments +=
          function_call.arguments;

      if (tool_calls) {
        if (!choices[index].message.tool_calls)
          choices[index].message.tool_calls = [];

        for (const tool_call of tool_calls) {
          const existingCallIndex = choices[index].message.tool_calls.findIndex(
            (tc) => tc.index === tool_call.index,
          );

          if (existingCallIndex === -1) {
            choices[index].message.tool_calls.push(tool_call);
          } else {
            const existingCall =
              choices[index].message.tool_calls[existingCallIndex];

            if (tool_call.function?.arguments) {
              existingCall.function.arguments += tool_call.function.arguments;
            }
          }
        }
      }

      res = {
        choices,
        citations: part.citations, // perplexity models return an array of citations links
        usage: {
          completion_tokens: tokens,
        },
      };

      onNewToken(res);
    }

    // remove the `index` property from the tool_calls if any
    // as it's only used to help us merge the tool_calls
    choices = choices.map((c) => {
      if (c.message.tool_calls) {
        c.message.tool_calls = c.message.tool_calls.map((tc) => {
          const { index, ...rest } = tc;
          return rest;
        });
      }
      return c;
    });

    res = {
      choices,
      tokens,
    };

    onNewToken(res);

    onComplete();
  } catch (error) {
    console.error(error);
    onError(error);
  }
}

// Replace {{variable}} with the value of the variable using regex
export function compileTextTemplate(
  content: string,
  variables: Record<string, string>,
) {
  const regex = /{{([^{}]*)}}/g;
  return content.replace(regex, (_, g1) => variables[g1] || "");
}

const OPENROUTER_HEADERS = {
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "HTTP-Referer": `https://lunary.ai`, // Optional, for including your app on openrouter.ai rankings.
  "X-Title": `Lunary.ai`,
  "Content-Type": "application/json",
};

export function compilePrompt(content: any, variables: any) {
  // support string messages
  const originalMessages =
    typeof content === "string" ? [{ role: "user", content }] : [...content];

  let compiledMessages = [];

  if (variables) {
    for (const item of originalMessages) {
      compiledMessages.push({
        ...item,
        content: compileTextTemplate(item.content, variables),
      });
    }
  } else {
    compiledMessages = [...originalMessages];
  }

  return compiledMessages;
}

// set undefined if it's invalid toolCalls
function validateToolCalls(model: string, toolCalls: any) {
  if (
    !toolCalls ||
    (!model.includes("gpt") &&
      !model.includes("claude") &&
      !model.includes("mistral")) ||
    !Array.isArray(toolCalls)
  )
    return undefined;

  // Check if it's the format with name, description, and input_schema
  const isNameDescriptionFormat = toolCalls.every(
    (t: any) => t.name && t.description && t.input_schema,
  );

  if (isNameDescriptionFormat) {
    return toolCalls;
  }

  // Check if it's the format with type "function" and function.name
  const isFunctionTypeFormat = toolCalls.every(
    (t: any) => t.type === "function" && t.function?.name,
  );

  if (isFunctionTypeFormat) {
    return toolCalls;
  }

  // If neither format is valid, return undefined
  return undefined;
}

interface ChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  system_fingerprint: string;
}

interface Choice {
  index: number;
  message: Message;
  logprobs: null;
  finish_reason: string;
}

interface Message {
  role: string;
  content: string;
}

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  completion_tokens_details: CompletionTokensDetails;
}

interface CompletionTokensDetails {
  reasoning_tokens: number;
}

function getOpenAIMessage(message: Anthropic.Messages.Message): ChatCompletion {
  return {
    id: message.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: message.model,
    choices: [
      {
        index: 0,
        message: {
          role: message.role,
          content: message.content
            .filter((block) => block.type === "text")
            .map((block) => (block as { text: string }).text)
            .join(""),
          tool_calls:
            message.content[1]?.type === "tool_use"
              ? [
                  {
                    id: message.content[1].id,
                    type: "function",
                    function: {
                      name: message.content[1].name,
                      arguments: JSON.stringify(message.content[1].input),
                    },
                  },
                ]
              : null,
        },
        logprobs: null,
        finish_reason: message.stop_reason || "stop",
      },
    ],
    usage: {
      prompt_tokens: message.usage.input_tokens,
      completion_tokens: message.usage.output_tokens,
      total_tokens: message.usage.input_tokens + message.usage.output_tokens,
      completion_tokens_details: {
        reasoning_tokens: message.usage.output_tokens,
      },
    },
    system_fingerprint: "anthropic_conversion",
  };
}

function getAnthropicMessage(message: any): any {
  const res = {
    role: message.role !== "tool" ? message.role : "user",
    content: [
      {
        type: "text",
        text: message?.content || "<empty>",
      },
    ],
  };

  if (message?.tool_calls) {
    res.content[1] = {
      type: "tool_use",
      id: message.tool_calls[0].id,
      name: message.tool_calls[0].function.name,
      input: JSON.parse(message.tool_calls[0].function.arguments),
    };
  }

  if (message.role === "tool") {
    res.content = [
      {
        type: "tool_result",
        tool_use_id: message.tool_call_id,
        content: "15 degrees",
      },
    ];
  }
  return res;
}

interface AzureClientOptions {
  apiKey: string;
  resourceName: string;
}

function inferProvider(modelId: string) {
  if (!modelId) return "openai";

  const normalized = modelId.toLowerCase();

  if (normalized.startsWith("claude")) return "anthropic";
  if (normalized.includes("mistral")) return "mistral";
  if (normalized.startsWith("o1") || normalized.startsWith("o3") || normalized.startsWith("o4"))
    return "openai";
  if (normalized.startsWith("gpt")) return "openai";
  if (normalized.startsWith("o")) return "openai";

  return "openai";
}
async function runAzureOpenAI(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  params: any = {},
  stream: boolean = false,
  modelId: string,
) {
  const [res] = await sql`
    select
      pc.api_key,
      pc.extra_config->>'resourceName' as resource_name,
      pcm.name as model_name
    from
      provider_config_model pcm
      left join provider_config pc on pcm.provider_config_id = pc.id
    where
      pcm.id = ${modelId}
  `;

  const clientOptions: AzureClientOptions = {
    apiKey: res.apiKey,
    resourceName: res.resourceName,
  };

  const modelName = res.modelName;
  const endpoint = `https://${clientOptions.resourceName}.openai.azure.com/`;

  const client = new AzureOpenAI({
    apiVersion: "2025-01-01-preview",
    apiKey: clientOptions.apiKey,
    endpoint,
  });

  const temperature = normalizeTemperature(modelName, params?.temperature);
  const maxTokens =
    params?.max_tokens ?? params?.max_completion_tokens ?? undefined;
  const reasoningEffort = normalizeOpenAIReasoningEffort(
    modelName,
    params?.reasoning_effort,
  );

  const chatCompletion = await client.chat.completions.create({
    model: modelName,
    messages: messages,
    stream: stream,
    temperature,
    top_p: params?.top_p,
    stop: params?.stop,
    functions: params?.functions,
    tools: validateToolCalls("gpt", params?.tools),
    seed: params?.seed,
    response_format: params?.response_format,
    ...getMaxTokenParam(modelName, maxTokens),
    ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
  });

  return chatCompletion;
}

export async function runAImodel(
  content: any,
  completionsParams: any,
  variables: Record<string, string> | undefined = undefined,
  model: Model | string,
  stream: boolean = false,
  orgId: string,
  projectId: string,
) {
  let resolvedModel: Model;

  if (typeof model === "string") {
    const builtInModel = MODELS.find((m) => m.id === model);

    if (builtInModel) {
      resolvedModel = builtInModel;
    } else {
      const [customModel] = await sql<{
        id: string;
        name: string;
        displayName: string | null;
        provider: string;
        providerConfigId: string;
        orgId: string;
        projectId: string;
      }[]>`
        select
          pcm.id,
          pcm.name,
          pcm.display_name,
          pc.provider_name as provider,
          pc.id as provider_config_id,
          pc.project_id,
          p.org_id
        from provider_config_model pcm
        join provider_config pc on pc.id = pcm.provider_config_id
        join project p on p.id = pc.project_id
        where pcm.id = ${model}
        ${projectId ? sql`and pc.project_id = ${projectId}` : sql``}
        ${orgId ? sql`and p.org_id = ${orgId}` : sql``}
      `;

      if (customModel) {
        resolvedModel = {
          id: customModel.id,
          name:
            customModel.displayName ||
            customModel.name ||
            customModel.id,
          provider: customModel.provider,
          isCustom: true,
          providerConfigId: customModel.providerConfigId,
        };
      } else {
        resolvedModel = {
          id: model,
          name: model,
          provider: inferProvider(model),
          isCustom: false,
        } as Model;
      }
    }
  } else {
    resolvedModel = model;
  }

  const modelId = resolvedModel.id;
  const modelName = resolvedModel.name;
  const modelProvider = resolvedModel.provider || inferProvider(modelId);
  const isCustomModel = resolvedModel.isCustom === true;

  if (orgId) {
    const [{ stripeCustomer }] =
      await sql`select stripe_customer from org where id = ${orgId}`;

    if (
      process.env.NODE_ENV === "production" &&
      process.env.STRIPE_SECRET_KEY
    ) {
      stripe.billing.meterEvents
        .create({
          event_name: "ai_playground",
          payload: {
            value: "1",
            stripe_customer_id: stripeCustomer,
          },
        })
        .then(() => console.info("Metered"))
        .catch(console.error);
    }
  }

  const copy = compilePrompt(content, variables);
  const messages = convertInputToOpenAIMessages(copy);

  let providerConfig;
  if (isCustomModel) {
    [providerConfig] =
      await sql`select * from provider_config where id = ${resolvedModel.providerConfigId}`;
  }

  if (isCustomModel && modelProvider === "azure_openai") {
    const chatCompletion = await runAzureOpenAI(
      messages,
      completionsParams,
      stream,
      modelId,
    );
    return chatCompletion;
  }

  if (isCustomModel && modelProvider === "amazon_bedrock") {
    const extraConfig = providerConfig.extraConfig || {};
    const accessKeyId = extraConfig.accessKeyId;
    const secretAccessKey = extraConfig.secretAccessKey;
    const region = extraConfig.region;

    if (!accessKeyId || !secretAccessKey || !region) {
      throw new Error("Missing Bedrock credentials in provider configuration");
    }

    const bedrock = createAmazonBedrock({
      accessKeyId,
      secretAccessKey,
      region,
    });

    const maxTokens =
      completionsParams?.max_tokens ??
      completionsParams?.max_completion_tokens;

    const { response } = await generateText({
      model: bedrock(modelName),
      messages,
      temperature: completionsParams?.temperature,
      maxTokens,
      topP: completionsParams?.top_p,
    });

    return {
      id: response.id,
      choices: response.messages.map((message, index) => ({
        index,
        message,
      })),
    };
  }

  if (modelProvider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY)
      throw Error("No Anthropic API key found");

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHORPIC_API_KEY,
    });

    const temperature =
      completionsParams?.temperature === null
        ? undefined
        : completionsParams?.temperature;
    const topP =
      temperature === undefined && completionsParams?.top_p !== null
        ? completionsParams?.top_p
        : undefined;

    const maxTokens =
      completionsParams?.max_tokens ??
      completionsParams?.max_completion_tokens;

    const thinking = normalizeAnthropicThinking(
      modelId,
      completionsParams?.thinking,
    );

    const res = await anthropic.messages.create({
      model: modelId,
      messages: messages
        .filter((m) => m.role !== "system")
        .map(getAnthropicMessage),
      system: messages.filter((m) => m.role === "system")[0]?.content,
      stream: false,
      temperature,
      top_p: topP,
      max_tokens: maxTokens || 4096,
      functions: completionsParams?.functions,
      tools: validateToolCalls(modelName, completionsParams?.tools),
      seed: completionsParams?.seed,
      ...(thinking ? { thinking } : {}),
    });

    return getOpenAIMessage(res);
  }

  if (modelProvider === "ibm-watsonx-ai") {
    if (!watsonxAi) {
      throw Error("Environment variables for WatsonX AI not found");
    }
    const maxTokens =
      completionsParams?.max_tokens ??
      completionsParams?.max_completion_tokens;

    const { result } = await watsonxAi.textChat({
      modelId: modelName,
      projectId: process.env.WATSONX_AI_PROJECT_ID,
      messages,
      temperature: completionsParams?.temperature,
      maxTokens,
      topP: completionsParams?.top_p,
    });

    return result;
  }

  let clientParams = {};
  let paramsOverwrite = {};

  switch (modelProvider) {
    case "openai":
      if (isCustomModel) {
        clientParams.apiKey = providerConfig.apiKey;
        break;
      }
      const params = getOpenAIParams();
      if (!params) throw Error("No OpenAI API key found");
      clientParams = params;
      break;
    case "mistral":
      if (!process.env.MISTRAL_API_KEY) throw Error("No Mistral API key found");

      clientParams = {
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: "https://api.mistral.ai/v1/",
      };
      break;
    case "openrouter":
      if (!process.env.OPENROUTER_API_KEY)
        throw Error("No OpenRouter API key found");

      clientParams = {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: OPENROUTER_HEADERS,
      };
      break;
    case "perplexity":
      if (!process.env.PERPLEXITY_API_KEY)
        throw Error("No Perplexity API key found");

      clientParams = {
        baseURL: "https://api.perplexity.ai",
        apiKey: process.env.PERPLEXITY_API_KEY,
      };
      break;
    case "x_ai":
      if (isCustomModel) {
        clientParams = {
          apiKey: providerConfig.apiKey,
          baseURL: "https://api.x.ai/v1/",
        };
        break;
      }
  }

  const openai = new OpenAI(clientParams);

  let res;

  if (modelId === "o3-pro") {
    stream = false;

    // Convert messages to a single prompt for the responses API
    const prompt = messages
      .map((msg) => {
        if (msg.role === "system") {
          return `System: ${msg.content}`;
        } else if (msg.role === "user") {
          return `User: ${msg.content}`;
        } else if (msg.role === "assistant") {
          return `Assistant: ${msg.content}`;
        }
        return msg.content;
      })
      .join("\n\n");

    // Use the OpenAI SDK's responses.create method
    const maxTokens =
      completionsParams?.max_tokens ??
      completionsParams?.max_completion_tokens;

    const response = await openai.responses.create({
      model: modelId,
      input: prompt,
      temperature: completionsParams?.temperature,
      max_output_tokens: maxTokens,
      top_p: completionsParams?.top_p,
      ...paramsOverwrite,
    });

    // Format the response to match the expected chat completion format
    res = {
      id: response.id || `response-${Date.now()}`,
      object: "chat.completion",
      created: response.created || Math.floor(Date.now() / 1000),
      model: model.id,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: response.output_text || "",
          },
          finish_reason: response.stop_reason || "stop",
        },
      ],
      usage: response.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  } else {
    const modelIdentifier = modelId || modelName;
    const temperature = normalizeTemperature(
      modelIdentifier,
      completionsParams?.temperature,
    );
    const maxTokens =
      completionsParams?.max_tokens ??
      completionsParams?.max_completion_tokens;
    const reasoningEffort = normalizeOpenAIReasoningEffort(
      modelIdentifier,
      completionsParams?.reasoning_effort,
    );

    res = await openai.chat.completions.create({
      model: modelIdentifier || "gpt-5",
      messages,
      stream: stream,
      temperature,
      top_p: completionsParams?.top_p,
      stop: completionsParams?.stop,
      functions: completionsParams?.functions,
      tools: validateToolCalls(modelName, completionsParams?.tools),
      seed: completionsParams?.seed,
      response_format: completionsParams?.response_format,
      ...paramsOverwrite,
      ...getMaxTokenParam(modelIdentifier, maxTokens),
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    });
  }

  const useOpenRouter = modelProvider === "openrouter";

  // openrouter requires a second request to get usage
  if (!stream && useOpenRouter && res.id) {
    // OpenRouter API to Querying Cost and Stats
    const generationData: any = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${res.id}`,
      { headers: OPENROUTER_HEADERS },
    ).then((res) => res.json());

    res.usage = {
      prompt_tokens: generationData?.data?.tokens_prompt,
      completion_tokens: generationData?.data?.tokens_completion,
      total_tokens:
        (generationData?.data?.tokens_prompt || 0) +
        (generationData?.data?.tokens_completion || 0),
    };
  }

  return res as OpenAI.ChatCompletion;
}
