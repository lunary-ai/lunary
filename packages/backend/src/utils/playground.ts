import { clearUndefined } from "./ingest"
import OpenAI from "openai"
import { MODELS } from "shared"
import { ReadableStream } from "stream/web"
import { getOpenAIParams } from "./openai"

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

type ChunkResult = {
  choices: { message: any }[]
  usage: {
    completion_tokens: number
  }
}

const checkIsAsyncIterable = (obj: any) => {
  return obj && typeof obj[Symbol.asyncIterator] === "function"
}

export async function handleStream(
  stream: ReadableStream,
  onNewToken: (data: ChunkResult) => void,
  onComplete: () => void,
  onError: (e: Error) => void,
) {
  try {
    if (!checkIsAsyncIterable(stream)) {
      onNewToken(stream)
      return onComplete()
    }

    let tokens = 0
    let choices: any[] = []
    let res: ChunkResult

    for await (const part of stream) {
      // 1 chunk = 1 token
      tokens += 1

      const chunk = part.choices[0]

      const { index, delta } = chunk

      const { content, function_call, role, tool_calls } = delta

      if (!choices[index]) {
        choices.splice(index, 0, {
          message: { role, function_call },
        })
      }

      if (content) {
        if (!choices[index].message.content) choices[index].message.content = ""
        choices[index].message.content += content
      }

      if (role) choices[index].message.role = role

      if (function_call?.name)
        choices[index].message.function_call.name = function_call.name

      if (function_call?.arguments)
        choices[index].message.function_call.arguments +=
          function_call.arguments

      if (tool_calls) {
        if (!choices[index].message.tool_calls)
          choices[index].message.tool_calls = []

        for (const tool_call of tool_calls) {
          const existingCallIndex = choices[index].message.tool_calls.findIndex(
            (tc) => tc.index === tool_call.index,
          )

          if (existingCallIndex === -1) {
            choices[index].message.tool_calls.push(tool_call)
          } else {
            const existingCall =
              choices[index].message.tool_calls[existingCallIndex]

            if (tool_call.function?.arguments) {
              existingCall.function.arguments += tool_call.function.arguments
            }
          }
        }
      }

      res = {
        choices,
        usage: {
          completion_tokens: tokens,
        },
      }

      onNewToken(res)
    }

    // remove the `index` property from the tool_calls if any
    // as it's only used to help us merge the tool_calls
    choices = choices.map((c) => {
      if (c.message.tool_calls) {
        c.message.tool_calls = c.message.tool_calls.map((tc) => {
          const { index, ...rest } = tc
          return rest
        })
      }
      return c
    })

    res = {
      choices,
      tokens,
    }

    onNewToken(res)

    onComplete()
  } catch (error) {
    console.error(error)
    onError(error)
  }
}

// Replace {{variable}} with the value of the variable using regex
export function compileTextTemplate(
  content: string,
  variables: Record<string, string>,
) {
  const regex = /{{(.*?)}}/g
  return content.replace(regex, (_, g1) => variables[g1] || "")
}

const OPENROUTER_HEADERS = {
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "HTTP-Referer": `https://lunary.ai`, // Optional, for including your app on openrouter.ai rankings.
  "X-Title": `Lunary.ai`,
  "Content-Type": "application/json",
}

export function compilePrompt(content: any, variables: any) {
  // support string messages
  const originalMessages =
    typeof content === "string" ? [{ role: "user", content }] : [...content]

  let compiledMessages = []

  if (variables) {
    for (const item of originalMessages) {
      compiledMessages.push({
        ...item,
        content: compileTextTemplate(item.content, variables),
      })
    }
  } else {
    compiledMessages = [...originalMessages]
  }

  return compiledMessages
}

// set undefined if it's invalid toolCalls
function validateToolCalls(model: string, toolCalls: any) {
  if (
    !toolCalls ||
    (!model.includes("gpt") &&
      !model.includes("claude") &&
      !model.includes("mistral")) ||
    !Array.isArray(toolCalls) ||
    toolCalls.find((t: any) => t.type !== "function" || !t.function?.name)
  )
    return undefined

  return toolCalls
}

export async function runAImodel(
  content: any,
  extra: any,
  variables: Record<string, string> | undefined = undefined,
  model: string,
  stream: boolean = false,
) {
  const copy = compilePrompt(content, variables)

  const messages = convertInputToOpenAIMessages(copy)

  const modelObj = MODELS.find((m) => m.id === model)

  let clientParams = {}
  let paramsOverwrite = {}

  const useAnthropic = modelObj?.provider === "anthropic"

  // disable streaming with anthropic, as their API is too different.
  const doStream = stream && !useAnthropic

  switch (modelObj?.provider) {
    case "anthropic":
      clientParams = {
        defaultHeaders: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        baseURL: "https://api.anthropic.com/v1/",
        fetch: async (url: string, options: any) => {
          // Anthropic doesn't use OpenAI's /chat/completions endpoint
          const newUrl = url.replace("/chat/completions", "/messages")
          return fetch(newUrl, options)
        },
      }

      paramsOverwrite = {
        messages: messages.filter((m) =>
          ["user", "assistant"].includes(m.role),
        ),
        system: messages.filter((m) => m.role === "system")[0]?.content,
        max_tokens: extra?.max_tokens || 4096, // required by anthropic
      }
      break

    case "openai":
      clientParams = getOpenAIParams()
      break
    case "mistral":
      clientParams = {
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: "https://api.mistral.ai/v1/",
      }
      break
    case "openrouter":
      clientParams = {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: OPENROUTER_HEADERS,
      }
      break
  }

  const openai = new OpenAI(clientParams)

  let res = await openai.chat.completions.create({
    model,
    messages,
    stream: doStream,
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
  })

  const useOpenRouter = modelObj?.provider === "openrouter"

  // openrouter requires a second request to get usage
  if (!stream && useOpenRouter && res.id) {
    // OpenRouter API to Querying Cost and Stats
    const generationData: any = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${res.id}`,
      { headers: OPENROUTER_HEADERS },
    ).then((res) => res.json())

    res.usage = {
      prompt_tokens: generationData?.data?.tokens_prompt,
      completion_tokens: generationData?.data?.tokens_completion,
      total_tokens:
        (generationData?.data?.tokens_prompt || 0) +
        (generationData?.data?.tokens_completion || 0),
    }
  }

  // Anthropic uses different format, convert to OpenAi
  if (useAnthropic) {
    res = {
      id: res.id,
      model: res.model,
      object: "chat.completion",
      created: Date.now(),
      choices: [
        {
          message: { role: "assistant", content: res.content[0].text },
          index: 1,
          finish_reason: res.stop_reason === "max_tokens" ? "length" : "stop",
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: res.usage?.input_tokens,
        completion_tokens: res.usage?.output_tokens,
        total_tokens:
          (res.usage?.input_tokens || 0) + (res.usage?.output_tokens || 0),
      },
    }
  }

  return res as OpenAI.ChatCompletion
}
