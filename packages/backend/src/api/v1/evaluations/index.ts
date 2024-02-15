import Router from "koa-router"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import { getReadableDateTime } from "@/src/utils/date"
import { runEval } from "./utils"
import { getEvaluation } from "./utils"
import { calcRunCost } from "@/src/utils/calcCost"
import { runChecksOnRun } from "@/src/checks/runChecks"

const evaluations = new Router({ prefix: "/evaluations" })

evaluations.post("/", async (ctx: Context) => {
  const { name, datasetId, checklistId, models } = ctx.request.body as any
  const { userId, projectId } = ctx.state

  // TODO: transactions, but not working with because of nesting
  const evaluationToInsert = {
    name: name ? name : `Evaluation of ${getReadableDateTime()}`,
    ownerId: userId,
    projectId,
    datasetId,
    models,
    checklistId,
    checks: [], // TODO: remove this legacy row from DB,
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
            checklistId,
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

evaluations.get("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params

  const [evaluation] = await sql`
    select * from evaluation where id = ${id} and project_id = ${projectId}
  `

  if (!evaluation) {
    ctx.throw(404, "Evaluation not found")
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
    select * from evaluation where project_id = ${projectId} order by created_at desc
  `

  ctx.body = evaluations
})

// special route used by the SDK to run evaluations
evaluations.post("/run", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { checklist, input, output, idealOutput, context, duration, model } =
    ctx.request.body as {
      checklist: string
      input: any
      output: any
      duration?: number
      idealOutput?: string
      context?: string
      model?: string
    }

  const [checklistData] =
    await sql` select * from checklist where slug = ${checklist} and project_id = ${projectId}`

  if (!checklistData) {
    ctx.throw(400, "Invalid checklist, is the slug correct?")
  }

  const checks = checklistData.data

  const virtualRun = {
    type: "llm",
    input,
    output,
    inputText: JSON.stringify(input),
    outputText: JSON.stringify(output),
    status: "success",
    // params: extra,
    name: model || "custom",
    duration: duration || 0,
    promptTokens: 0,
    completionTokens: 0,
    createdAt: new Date(),
    endedAt: new Date(),
    // Eval-only fields:
    idealOutput,
    context,
    // So the SQL queries don't fail:
    id: "00000000-0000-4000-8000-000000000000",
    projectId: "00000000-0000-4000-8000-000000000000",
    isPublic: false,
    cost: 0,
  }

  const cost = calcRunCost(virtualRun)
  virtualRun.cost = cost
  virtualRun.duration = virtualRun.duration / 1000 // needs to be in ms in calcRunCost, but needs to be in seconds in the checks

  // run checks
  const { passed, results } = await runChecksOnRun(virtualRun, checks)

  console.log(`---------------------`)
  console.log(passed, results)

  ctx.body = { passed, results }
})

export default evaluations
