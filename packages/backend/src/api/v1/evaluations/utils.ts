import { runChecksOnRun } from "@/src/checks/runChecks"
import { calcRunCost } from "@/src/utils/calcCost"
import sql from "@/src/utils/db"
import { compileChatMessages, runAImodel } from "@/src/utils/playground"
import { FilterLogic } from "shared"

export async function runEval(
  evaluationId: string,
  promptId: string,
  variationId: string,
  model: string,
  prompt: any,
  extra: any,
  variation: any,
  checks: FilterLogic,
) {
  try {
    console.log(`=============================`)
    console.log(
      `Running eval for ${model} with variation ${JSON.stringify(variation.variables)}`,
    )
    const { variables, idealOutput, context } = variation

    // run AI query
    const createdAt = new Date()
    const input = compileChatMessages(prompt, variables)
    console.log(input)

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

    // insert into eval_result
    await sql`
      insert into evaluation_result ${sql({
        evaluationId,
        promptId,
        variationId,
        model,
        output: JSON.stringify(output),
        results: JSON.stringify(results),
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
