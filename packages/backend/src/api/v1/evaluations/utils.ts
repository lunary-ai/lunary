import { runChecksOnRun } from "@/src/checks/runChecks"
import { calcRunCost } from "@/src/utils/calcCost"
import sql from "@/src/utils/db"
import { compilePrompt, runAImodel } from "@/src/utils/playground"

interface RunEvalParams {
  evaluationId: string
  promptId: string
  checklistId: string
  model: string
  prompt: any
  extra: any
  variation: any
}

export async function runEval({
  evaluationId,
  promptId,
  checklistId,
  model,
  prompt,
  extra,
  variation,
}: RunEvalParams) {
  try {
    console.log(`=============================`)
    console.log(
      `Running eval for ${model} with variation ${JSON.stringify(variation.variables)}`,
    )
    const { variables, idealOutput, context } = variation

    const [checklist] =
      await sql`select * from checklist where id = ${checklistId}`

    const checks = checklist.data

    // run AI query
    const createdAt = new Date()

    const input = compilePrompt(prompt, variables)

    const res = await runAImodel(input, extra, undefined, model)
    const endedAt = new Date()

    // Create virtual run to be able to run checks
    const output = res.choices[0].message

    const promptTokens = res.usage?.prompt_tokens
    const completionTokens = res.usage?.completion_tokens
    const duration = endedAt.getTime() - createdAt.getTime()

    const virtualRun = {
      type: "llm",
      input,
      output,
      inputText: JSON.stringify(input),
      outputText: JSON.stringify(output),
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
      cost: 0,
    }

    const cost = calcRunCost(virtualRun)
    virtualRun.cost = cost
    virtualRun.duration = virtualRun.duration / 1000 // needs to be in ms in calcRunCost, but needs to be in seconds in the checks

    // run checks
    const { passed, results } = await runChecksOnRun(virtualRun, checks)

    console.log(`---------------------`)
    console.log(output)
    console.log(`---------------------`)

    // insert into eval_result
    await sql`
      insert into evaluation_result ${sql({
        evaluationId,
        promptId,
        variationId: variation.id,
        model,
        output,
        results,
        passed,
        completionTokens,
        cost,
        duration,
      })}
      `
  } catch (error) {
    console.error(error)
  }
}

export async function getEvaluation(evaluationId: string) {
  const rows = await sql`
    select
      e.id as id,
      e.created_at as created_at,
      e.name as name,
      e.project_id as project_id,
      e.owner_id as owner_id,
      e.models as models,
      e.checks as checks,
      d.id as dataset_id,
      d.slug as dataset_slug,
      p.id as prompt_id,
      p.messages as prompt_messages,
      pv.id as variation_id,
      pv.variables,
      pv.context,
      pv.ideal_output
    from
      evaluation e
      left join dataset d on e.dataset_id = d.id 
      left join dataset_prompt p on d.id = p.dataset_id
      left join dataset_prompt_variation pv on pv.prompt_id = p.id
    where 
      e.id = ${evaluationId}
    `

  const {
    id,
    createdAt,
    name,
    ownerId,
    projectId,
    models,
    checks,
    datasetId,
    datasetSlug,
  } = rows[0]

  const evaluation = {
    id,
    createdAt,
    name,
    projectId,
    ownerId,
    models,
    checks,
    dataset: {
      id: datasetId,
      slug: datasetSlug,
      prompts: rows.map(({ promptId, promptMessages }) => ({
        id: promptId,
        content: promptMessages,
        variations: rows
          .filter((row) => row.promptId === promptId)
          .map(({ variationId, variables, context, idealOutput }) => ({
            id: variationId,
            variables,
            context,
            idealOutput,
          })),
      })),
    },
  }

  return evaluation
}
