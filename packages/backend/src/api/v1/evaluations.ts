import Router from "koa-router"
import sql from "@/src/utils/db"
import { z } from "zod"
import Context from "@/src/utils/koa"
import { compileChatMessages, runAImodel } from "@/src/utils/playground"
import { calcRunCost } from "@/src/utils/calcCost"
import { runChecksOnRun } from "@/src/checks/runChecks"
import { FilterLogic } from "shared"

const evaluations = new Router({ prefix: "/evaluations" })

evaluations.post("/", async (ctx: Context) => {
  const bodySchema = z.object({
    name: z.string().min(1),
    models: z.array(z.string()),
    checks: z.array(z.object({})),
    prompts: z.array(
      z.object({
        content: z.object({}),
        extra: z.object({}),
        variations: z.optional(
          z.array(
            z.object({
              variables: z.object({}),
              context: z.string().optional(),
              idealOutput: z.string().optional(),
            }),
          ),
        ),
      }),
    ),
  })

  const { name, models, checks, prompts } = bodySchema.parse(ctx.request.body)
  const { userId, projectId } = ctx.state

  await sql.begin(async (sql) => {
    const evaluationToInsert = {
      name,
      ownerId: userId,
      projectId,
      models,
      checks,
    }

    const [insertedEvaluation] =
      await sql`insert into evaluation ${sql(evaluationToInsert)} returning *`

    for (const prompt of prompts) {
      const promptToInsert = {
        evaluationId: insertedEvaluation.id,
        content: prompt.content,
        extra: prompt.extra,
      }
      const [insertedPrompt] =
        await sql`insert into prompt ${sql(promptToInsert)} returning *`

      if (prompt.variations) {
        for (const variation of prompt.variations) {
          const variationToInsert = {
            promptId: insertedPrompt.id,
            variables: variation.variables,
            context: variation.context,
            idealOutput: variation.idealOutput,
          }

          await sql`insert into prompt_variation ${sql(variationToInsert)}`
        }
      }
    }
  })

  ctx.status = 201
})

evaluations.get("/:id", async (ctx: Context) => {
  const { id } = ctx.params

  const evaluationId = z.string().uuid().parse(id)

  const rows = await sql`
    select
      e.*,
      p.id as prompt_id,
      p.content,
      p.extra,
      pv.id as variation_id,
      pv.variables,
      pv.context,
      pv.ideal_output
    from
      evaluation e
      inner join prompt p on e.id = p.evaluation_id
      left join prompt_variation pv on pv.prompt_id = p.id
      where e.id = ${evaluationId}
    `

  if (!rows) {
    ctx.throw(404, "Evaluation not found")
    return
  }

  const evaluationData = {
    ...rows[0],
    prompts: [],
    promptVariations: [],
  }

  // TODO: use .groupBy instead
  for (const row of rows) {
    if (!evaluationData.prompts.find((p) => p.id === row.promptId)) {
      evaluationData.prompts.push({
        id: row.promptId,
        content: row.content,
        extra: row.extra,
        variations: [],
      })
    }

    if (row.variationId) {
      evaluationData.prompts
        .find((p) => p.id === row.variationId)
        .variations.push({
          id: row.variation_id,
          variables: row.variables,
          context: row.context,
          ideal_output: row.ideal_output,
        })
    }
  }

  ctx.body = evaluationData
})

const testEval = {
  models: ["gpt-3.5-turbo"], //, "gpt-4-turbo-preview"],
  checks: [
    "OR",
    {
      id: "duration",
      params: {
        operator: "gt",
        duration: 300,
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

async function runEval(
  model: string,
  prompt: any,
  extra: any,
  variation: any,
  checks: FilterLogic,
) {
  try {
    console.log(`=============================`)
    console.log(`Running eval for ${model} with prompt ${prompt}`)
    const { variables, idealOutput, context } = variation

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
      params: extra,
      name: model,
      duration,
      promptTokens,
      completionTokens,
      createdAt,
      endedAt,
      // Eval-only fields:
      idealOutput,
      context,
      // So the SQL queries don't fail:
      id: "00000000-0000-4000-8000-000000000000",
      projectId: "00000000-0000-4000-8000-000000000000",
      isPublic: false,
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

evaluations.post("/run", async (ctx) => {
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

export default evaluations
