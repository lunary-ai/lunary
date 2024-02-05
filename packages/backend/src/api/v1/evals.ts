import { runChecksOnRun } from "@/src/checks/runChecks"
import { calcRunCost } from "@/src/utils/calcCost"

import { compileChatMessages, runAImodel } from "@/src/utils/playground"
import Router from "koa-router"
import { FilterLogic } from "shared"

const evals = new Router({
  prefix: "/evals",
})

evals.get("/", async (ctx) => {
  ctx.body = {}
})

const testEval = {
  models: ["gpt-3.5-turbo", "gpt-4-turbo-preview"],
  checks: [
    "OR",
    {
      id: "duration",
      params: {
        operator: "gt",
        duration: 30000,
      },
    },
  ],
  prompts: [
    {
      content: [{ role: "user", content: "{{question}}" }],
      extra: { temperature: 1 },
      variations: [
        {
          variables: {
            question: "What is your name?",
          },
          gold: "My name is SuperChatbot.",
          context: "You are a chatbot called SuperChatbot.",
        },
      ],
    },
  ],
}

const runEval = async (
  model: string,
  prompt: any,
  extra: any,
  variation: any,
  checks: FilterLogic,
) => {
  try {
    console.log(`=============================`)
    console.log(`Running eval for ${model} with prompt ${prompt}`)
    const { variables, gold, context } = variation

    // run AI query

    const createdAt = new Date()
    const input = compileChatMessages(prompt, variables)
    const res = await runAImodel(input, extra, undefined, model)
    const endedAt = new Date()

    // Create virtual run to be able to run checks

    const output = res.choices[0].message
    const promptTokens = res.usage.prompt_tokens
    const completionTokens = res.usage.completion_tokens
    const duration = endedAt.getTime() - createdAt.getTime()

    const virtualRun = {
      type: "llm",
      input,
      output,
      status: "success",
      extra,
      name: model,
      duration,
      promptTokens,
      completionTokens,
    }

    virtualRun.cost = calcRunCost(virtualRun)

    console.log(` virtualRun: `, JSON.stringify(virtualRun, null, 2))

    // run checks with context and gold

    const { passed, results } = await runChecksOnRun(virtualRun, checks)

    console.log(passed, results)

    // insert into eval_result

    // await sql`
    //   insert into eval_result ${sql({
    //     model,
    //     prompt,
    //     extra,
    //     variables,
    //     gold,
    //     context,
    //     output
    //   })}
  } catch (error) {
    console.error(error)
  }
}

evals.post("/run", async (ctx) => {
  const { prompts, models, checks } = testEval

  // for each variation of each prompt and each model, run the eval
  for (const prompt of prompts) {
    for (const model of models) {
      for (const variation of prompt.variations) {
        await runEval(model, prompt.content, prompt.extra, variation, checks)
      }
    }
  }

  ctx.body = {}
})

export default evals
