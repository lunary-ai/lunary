import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { MODELS } from "shared";
import { ReadableStream } from "stream/web";
import sql from "./db";
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
            message.content[1]?.type === "function"
              ? [
                  {
                    id: message.content[1].id,
                    type: "function",
                    function: {
                      name: message.content[1].name,
                      arguments: message.content[1].input,
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
  console.log(message);
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
  console.log(res);
  return res;
}

export async function runAImodel(
  content: any,
  extra: any,
  variables: Record<string, string> | undefined = undefined,
  model: string,
  stream: boolean = false,
  orgId: string,
) {
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
        .then(() => console.log("Metered"))
        .catch(console.error);
    }
  }

  const copy = compilePrompt(content, variables);

  const messages = convertInputToOpenAIMessages(copy);
  const modelObj = MODELS.find((m) => m.id === model);

  const useAnthropic = modelObj?.provider === "anthropic";
  if (useAnthropic) {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHORPIC_API_KEY,
    });

    const res = await anthropic.messages.create({
      model,
      messages: messages
        .filter((m) => m.role !== "system")
        .map(getAnthropicMessage),
      system: messages.filter((m) => m.role === "system")[0]?.content,
      stream: false,
      temperature: extra?.temperature,
      max_tokens: extra?.max_tokens || 4096,
      top_p: extra?.top_p,
      presence_penalty: extra?.presence_penalty,
      frequency_penalty: extra?.frequency_penalty,
      functions: extra?.functions,
      tools: validateToolCalls(model, extra?.tools),
      seed: extra?.seed,
    });

    return getOpenAIMessage(res);
  }

  let clientParams = {};
  let paramsOverwrite = {};

  switch (modelObj?.provider) {
    case "openai":
      clientParams = getOpenAIParams();
      break;
    case "mistral":
      clientParams = {
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: "https://api.mistral.ai/v1/",
      };
      break;
    case "openrouter":
      clientParams = {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: OPENROUTER_HEADERS,
      };
      break;
  }

  const openai = new OpenAI(clientParams);

  let res = await openai.chat.completions.create({
    model,
    messages,
    stream: stream,
    temperature: extra?.temperature,
    max_tokens: extra?.max_tokens,
    top_p: extra?.top_p,
    presence_penalty: extra?.presence_penalty,
    frequency_penalty: extra?.frequency_penalty,
    stop: extra?.stop,
    functions: extra?.functions,
    tools: validateToolCalls(model, extra?.tools),
    seed: extra?.seed,
    ...paramsOverwrite,
  });

  const useOpenRouter = modelObj?.provider === "openrouter";

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
