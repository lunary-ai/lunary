import { OpenAIStream, StreamingTextResponse } from "ai"

import OpenAI from "openai"

import { completion } from "litellm"
import { ensureAppIsLogged } from "@/lib/api/ensureAppIsLogged"
import { edgeWrapper } from "@/lib/api/helpers"

const OPENROUTER_MODELS = [
  "mistralai/mistral-7b-instruct",
  "openai/gpt-4-32k",
  "google/palm-2-chat-bison",
  "meta-llama/llama-2-13b-chat",
  "meta-llama/llama-2-70b-chat",
]

const ANTHROPIC_MODELS = ["claude-2"]

const convertInputToOpenAIMessages = (input: any[]) => {
  return input.map(({ role, text, functionCall }) => {
    return {
      role: role.replace("ai", "assistant"),
      content: text,
      // function_call: functionCall || undefined,
    }
  })
}

export const runtime = "edge"

export default edgeWrapper(async function handler(req: Request) {
  const supabase = await ensureAppIsLogged(req)

  const teamOwner = await supabase
    .from("profile")
    .select("play_allowance")
    .eq("id", req.user.id)
    .single()

  // remove 1 to 'play_allowance' to either logged user or team_owner
  const { data: user } = await supabase
    .from("profile")
    .select("play_allowance")
    .eq("id", req.user.id)
    .single()

  const { model, run } = await req.json()

  const messages = convertInputToOpenAIMessages(run.input)

  let method

  if (ANTHROPIC_MODELS.includes(model)) {
    method = completion
  } else {
    const openAIparams = OPENROUTER_MODELS.includes(model)
      ? {
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://llmonitor.com",
            "X-Title": `LLMonitor.com`,
          },
        }
      : {
          apiKey: process.env.OPENAI_API_KEY,
        }

    const openai = new OpenAI(openAIparams)

    method = openai.chat.completions.create.bind(openai.chat.completions)
  }

  // TODO: server side protection for free plan users
  // Allow only 1 playground run per month

  const response = await method({
    model,
    messages,
    temperature: run.params?.temperature,
    max_tokens: run.params?.max_tokens,
    stream: true,
    functions: run.params?.functions,
  })

  const stream = OpenAIStream(response)

  return new StreamingTextResponse(stream)
})
