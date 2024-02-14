import Router from "koa-router"
import sql from "@/src/utils/db"
import { z } from "zod"
import Context from "@/src/utils/koa"
import { Evaluation } from "shared"
import { getReadableDateTime } from "@/src/utils/date"
import { runEval } from "./utils"
import { getEvaluation } from "./utils"

const evaluations = new Router({ prefix: "/evaluations" })

evaluations.post("/", async (ctx: Context) => {
  const { name, datasetId, checks, models } = ctx.request.body as any
  const { userId, projectId } = ctx.state

  // TODO: transactions, but not working with because of nesting
  const evaluationToInsert = {
    name: name ? name : `Evaluation of ${getReadableDateTime()}`,
    ownerId: userId,
    projectId,
    datasetId,
    models,
    checks,
  }

  const [insertedEvaluation] =
    await sql`insert into evaluation ${sql(evaluationToInsert)} returning *`

  const evaluation = await getEvaluation(insertedEvaluation.id)

  const evalsToRun = []
  for (const prompt of evaluation.dataset.prompts) {
    for (const variation of prompt.variations) {
      for (const model of evaluation.models) {
        evalsToRun.push(
          runEval({
            evaluationId: evaluation.id,
            promptId: prompt.id,
            variation,
            model,
            prompt: prompt.content,
            checks,
            extra: {},
          }),
        )
      }
    }
  }

  await Promise.all(evalsToRun)

  ctx.status = 201
  ctx.body = { evaluationId: insertedEvaluation.id }
})

evaluations.post("/", async (ctx: Context) => {
  const { name, models, checks, prompts } = ctx.request.body as Evaluation
  const { userId, projectId } = ctx.state

  // TODO: transactions, but not working with because of nesting

  const evaluationToInsert = {
    name: name ? name : `Evaluation of ${getReadableDateTime()}`,
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
      await sql`insert into evaluation_prompt ${sql(promptToInsert)} returning *`

    if (prompt.variations) {
      for (const variation of prompt.variations) {
        const variationToInsert = {
          promptId: insertedPrompt.id,
          variables: variation.variables,
          context: variation.context,
          idealOutput: variation.idealOutput,
        }

        const [insertedVariation] =
          await sql`insert into evaluation_prompt_variation ${sql(variationToInsert)} returning *`

        const evalsToRun = []
        for (const model of models) {
          evalsToRun.push(
            runEval(
              insertedEvaluation.id,
              insertedPrompt.id,
              insertedVariation.id,
              model,
              prompt.content,
              prompt.extra,
              variation,
              checks,
            ),
          )
        }
        await Promise.all(evalsToRun)
      }
    }
  }

  ctx.status = 201
  ctx.body = { evaluationId: insertedEvaluation.id }
})

evaluations.get("/:id", async (ctx: Context) => {
  const evaluationId = z.string().uuid().parse(ctx.params.id)

  const rows = await sql`
    select
      e.*,
      p.id as prompt_id,
      p.content as prompt_content,
      p.extra as prompt_extra,
      pv.id as variation_id,
      pv.variables,
      pv.context,
      pv.ideal_output
    from
      evaluation e
      left join evaluation_prompt p on e.id = p.evaluation_id
      left join evaluation_prompt_variation pv on pv.prompt_id = p.id
    where 
      e.id = ${evaluationId}
    `

  if (!rows) {
    ctx.throw(404, "Evaluation not found")
  }

  const { id, createdAt, name, ownerId, projectId, models, checks } = rows[0]

  const evaluation = {
    id,
    createdAt,
    name,
    ownerId,
    projectId,
    models,
    checks,
    prompts: rows.map(({ promptId, promptContent, promptExtra }) => ({
      id: promptId,
      content: promptContent,
      extra: promptExtra,
      variations: rows
        .filter((row) => row.promptId === promptId)
        .map(({ variationId, variables, context, idealOutput }) => ({
          id: variationId,
          variables,
          context,
          idealOutput,
        })),
    })),
  }

  ctx.body = evaluation
})

evaluations.get("/result/:evaluationId", async (ctx: Context) => {
  const { evaluationId } = ctx.params

  const results = await sql`
  select 
    *,
    p.id as prompt_id,
    p.messages as prompt_content
    --p.extra as prompt_extra
  from 
    evaluation_result er 
    left join dataset_prompt p on p.id = er.prompt_id
    left join dataset_prompt_variation pv on pv.id = er.variation_id
  where 
    er.evaluation_id = ${evaluationId}`

  ctx.body = results
})

evaluations.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state

  const evaluations = await sql`
    select
      e.id,
      e.created_at,
      e.name,
      e.owner_id,
      e.project_id
    from
      evaluation e
    where
      e.project_id = ${projectId} 
    order by 
      created_at desc
  `

  ctx.body = evaluations
})

evaluations.post("/run", async (ctx: Context) => {
  console.log("running eval")
  console.log(ctx.request.body)
  ctx.body = { passed: true, results: [] }
})

export default evaluations
