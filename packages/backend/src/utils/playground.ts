import { clearUndefined } from "./ingest"
import OpenAI from "openai"
import { completion } from "litellm"
import { MODELS } from "shared"

function convertInputToOpenAIMessages(input: any[]) {
  return input.map(({ role, content, text, functionCall, toolCalls, name }) => {
    return clearUndefined({
      role: role.replace("ai", "assistant"),
      content: content || text,
      function_call: functionCall || undefined,
      tool_calls: toolCalls || undefined,
      name: name || undefined,
    })
  })
}

const OPENROUTE_HEADERS = {
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "HTTP-Referer": `https://lunary.ai`, // Optional, for including your app on openrouter.ai rankings.
  "X-Title": `Lunary.ai`,
  "Content-Type": "application/json",
}

// Replace {{variable}} with the value of the variable using regex
export function compileTemplate(
  content: string,
  variables: Record<string, string>,
) {
  const regex = /{{(.*?)}}/g
  return content.replace(regex, (_, g1) => variables[g1] || "")
}

export function compileChatMessages(content: any, variables: any) {
  // Create a deep copy of the content to prevent mutation of the original array
  let copy = JSON.parse(JSON.stringify(content))

  if (variables) {
    for (const item of copy) {
      item.content = compileTemplate(item.content, variables)
    }
  }

  return copy
}

export async function runAImodel(
  content: any,
  extra: any,
  variables: Record<string, string> | undefined = undefined,
  model: string,
  stream: boolean = false,
) {
  const copy = compileChatMessages(content, variables)

  const messages = convertInputToOpenAIMessages(copy)

  let method: any

  const modelObj = MODELS.find((m) => m.id === model)

  const useAnthropic = modelObj?.provider === "anthropic"
  const useOpenRouter = modelObj?.provider === "openrouter"

  if (useAnthropic) {
    method = completion
  } else {
    const openAIparams = useOpenRouter
      ? {
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: OPENROUTE_HEADERS,
        }
      : {
          apiKey: process.env.OPENAI_API_KEY,
        }

    const openai = new OpenAI(openAIparams)

    method = openai.chat.completions.create.bind(openai.chat.completions)
  }

  const res = await method({
    model,
    messages,
    stream,
    temperature: extra?.temperature,
    max_tokens: extra?.max_tokens,
    top_p: extra?.top_p,
    top_k: extra?.top_k,
    presence_penalty: extra?.presence_penalty,
    frequency_penalty: extra?.frequency_penalty,
    stop: extra?.stop,
    functions: extra?.functions,
    tools: extra?.tools,
    seed: extra?.seed,
  })

  if (!stream && useOpenRouter && res.id) {
    // OpenRouter API to Querying Cost and Stats
    const generationData: any = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${res.id}`,
      { headers: OPENROUTE_HEADERS },
    ).then((res) => res.json())

    res.usage = {
      prompt_tokens: generationData?.data?.tokens_prompt,
      completion_tokens: generationData?.data?.tokens_completion,
    }
  }

  return res
}
