import { runChecksOnRun } from "@/src/checks/runChecks"
import { calcRunCost } from "@/src/utils/calcCost"
import sql from "@/src/utils/db"
import { compilePrompt, runAImodel } from "@/src/utils/playground"
import { Provider } from "shared"

interface RunEvalParams {
  evaluationId: string
  promptId: string
  checklistId: string
  provider: Provider
  prompt: any
  variation: any
}

export async function runEval({
  evaluationId,
  promptId,
  checklistId,
  provider,
  prompt,
  variation,
}: RunEvalParams) {
  try {
    console.log(`=============================`)
    console.log(
      `Running eval for ${provider.model} with variation ${JSON.stringify(variation.variables)} and config ${JSON.stringify(provider.config)}`,
    )
    const { variables, idealOutput, context } = variation

    let checks = []

    if (checklistId) {
      const [checklist] =
        await sql`select * from checklist where id = ${checklistId}`

      checks = checklist.data
    }

    // run AI query
    const createdAt = new Date()

    const input = compilePrompt(prompt, variables)

    try {
      let res
      let attempts = 0
      while (attempts < 3) {
        // retry 2 times
        try {
          res = await runAImodel(
            input,
            provider.config,
            undefined,
            provider.model,
          )
          break // Break the loop if the call was successful
        } catch (error) {
          attempts++
          if (attempts >= 3) throw error // Rethrow error after 2 retries
        }
      }

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
        params: provider.config,
        name: provider.model,
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
      virtualRun.cost = cost || 0
      virtualRun.duration = virtualRun.duration / 1000 // needs to be in ms in calcRunCost, but needs to be in seconds in the checks

      // run checks
      const { passed, results } = await runChecksOnRun(virtualRun, checks)

      // insert into eval_result
      await sql`
      insert into evaluation_result ${sql({
        status: "success",
        evaluationId,
        promptId,
        variationId: variation.id,
        provider,
        output,
        results,
        passed,
        completionTokens,
        cost,
        duration,
      })}
      `
    } catch (error: any) {
      await sql`
        insert into evaluation_result ${sql({
          status: "error",
          evaluationId,
          promptId,
          variationId: variation.id,
          provider,
          error: error.message,
        })}
        `
    }
  } catch (error) {
    console.error(error)
  }
}
