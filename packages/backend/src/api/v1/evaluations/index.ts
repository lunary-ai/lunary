import Router from "koa-router"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import { getReadableDateTime } from "@/src/utils/date"
import { runEval } from "./utils"
import { getEvaluation } from "./utils"
import { calcRunCost } from "@/src/utils/calcCost"
import { runChecksOnRun } from "@/src/checks/runChecks"
import PQueue from "p-queue"
import { PassThrough } from "stream"
import { checkAccess } from "@/src/utils/authorization"

const evaluations = new Router({ prefix: "/evaluations" })

const MAX_PARALLEL_EVALS = 4

evaluations.post(
  "/",
  checkAccess("evaluations", "create"),
  async (ctx: Context) => {
    const { name, datasetId, checklistId, providers } = ctx.request.body as any
    const { userId, projectId } = ctx.state

    ctx.request.socket.setTimeout(0)
    ctx.request.socket.setNoDelay(true)
    ctx.request.socket.setKeepAlive(true)

    ctx.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    })

    const queue = new PQueue({
      concurrency: MAX_PARALLEL_EVALS,
      timeout: 10000,
    })

    // TODO: transactions, but not working with because of nesting
    const evaluationToInsert = {
      name: name ? name : `Evaluation of ${getReadableDateTime()}`,
      ownerId: userId,
      projectId,
      datasetId,
      providers,
      checklistId,
      models: [], // TODO: remove this legacy col from DB,
      checks: [], // TODO: remove this legacy col from DB,
    }

    const [insertedEvaluation] =
      await sql`insert into evaluation ${sql(evaluationToInsert)} returning *`

    const evaluation = await getEvaluation(insertedEvaluation.id)

    let count = 0

    for (const prompt of evaluation.dataset.prompts) {
      for (const variation of prompt.variations) {
        for (const provider of evaluation.providers) {
          count++
          queue.add(() =>
            runEval({
              evaluationId: evaluation.id,
              promptId: prompt.id,
              variation,
              provider,
              prompt: prompt.content,
              checklistId,
            }),
          )
        }
      }
    }

    const stream = new PassThrough()
    stream.pipe(ctx.res)
    ctx.status = 200
    ctx.body = stream

    queue.on("active", () => {
      const percentDone = ((count - queue.size) / count) * 100
      console.log(`Active: ${queue.size} of ${count} (${percentDone}%)`)
      console.log()
      stream.write(JSON.stringify({ percentDone }) + "\n")
    })

    await queue.onIdle()

    stream.write(JSON.stringify({ id: evaluation?.id }) + "\n")

    stream.end()
  },
)

evaluations.get(
  "/:id",
  checkAccess("evaluations", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { id } = ctx.params

    const [evaluation] = await sql`
    select * from evaluation where id = ${id} and project_id = ${projectId}
  `

    if (!evaluation) {
      ctx.throw(404, "Evaluation not found")
    }

    ctx.body = evaluation
  },
)

evaluations.get(
  "/result/:evaluationId",
  checkAccess("evaluations", "read"),
  async (ctx: Context) => {
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
  },
)

evaluations.get(
  "/",
  checkAccess("evaluations", "list"),
  async (ctx: Context) => {
    const { projectId } = ctx.state

    const evaluations = await sql`
    select * from evaluation where project_id = ${projectId} order by created_at desc
  `

    ctx.body = evaluations
  },
)

// special route used by the SDK to run evaluations
evaluations.post(
  "/run",
  checkAccess("evaluations", "create"),
  async (ctx: Context) => {
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
  },
)

export default evaluations
