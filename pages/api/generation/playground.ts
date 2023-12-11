import { OpenAIStream, StreamingTextResponse } from "ai"

import OpenAI from "openai"

import { completion } from "litellm"
import { ensureIsLogged } from "@/lib/api/ensureAppIsLogged"
import { edgeWrapper } from "@/lib/api/edgeHelpers"
import Handlebars from "handlebars"

export const runtime = "edge"

const OPENROUTER_MODELS = [
  "mistralai/mistral-7b-instruct",
  "openai/gpt-4-32k",
  "openchat/openchat-7b",
  "teknium/openhermes-2.5-mistral-7b",
  "open-orca/mistral-7b-openorca",
  "perplexity/pplx-70b-chat",
  "perplexity/pplx-7b-chat",
  "google/palm-2-chat-bison",
  "meta-llama/llama-2-13b-chat",
  "meta-llama/llama-2-70b-chat",
]

const ANTHROPIC_MODELS = ["claude-2", "claude-2.0", "claude-instant-v1"]

const convertInputToOpenAIMessages = (input: any[]) => {
  return input.map(({ role, content, text, functionCall, toolCalls, name }) => {
    return {
      role: role.replace("ai", "assistant"),
      content: content || text,
      function_call: functionCall || undefined,
      tool_calls: toolCalls || undefined,
      name: name || undefined,
    }
  })
}

const substractPlayAllowance = async (session, supabase) => {
  const { data: profile, error } = await supabase
    .from("profile")
    .select("id, org(id, play_allowance)")
    .match({ id: session.user.id })
    .single()

  if (error) throw error

  if (profile.org?.play_allowance <= 0) {
    throw new Error(
      "No allowance left today. Wait tomorrow or upgrade to continue using the playground.",
    )
  }

  // don't await to go faster
  await supabase
    .from("org")
    .update({ play_allowance: profile.org.play_allowance - 1 })
    .eq("id", profile.org.id)
}

export default edgeWrapper(async function handler(req: Request) {
  const { session, supabase } = await ensureIsLogged(req)

  await substractPlayAllowance(session, supabase)

  const { content, extra, testValues } = await req.json()

  let copy = [...content]

  // The template build happens here
  if (testValues) {
    for (const item of copy) {
      let template = Handlebars.compile(item.content)
      // execute the compiled template and print the output to the console
      item.content = template(testValues)
      console.log("compiled", item.content)
    }
  }

  const model = extra?.model || "gpt-3.5-turbo"

  const messages = convertInputToOpenAIMessages(copy)

  let method

  if (ANTHROPIC_MODELS.includes(model)) {
    method = completion
  } else {
    const openAIparams = OPENROUTER_MODELS.includes(model)
      ? {
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://lunary.ai",
            "X-Title": `Lunary.ai`,
          },
        }
      : {
          apiKey: process.env.OPENAI_API_KEY,
        }

    const openai = new OpenAI(openAIparams)

    method = openai.chat.completions.create.bind(openai.chat.completions)
  }

  const response = await method({
    model,
    messages,
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
    stream: true,
  })

  const stream = OpenAIStream(response)

  return new StreamingTextResponse(stream)
})
