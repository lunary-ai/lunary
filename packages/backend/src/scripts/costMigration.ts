import { calcRunCost } from "@/src/utils/calcCost"
import sql from "@/src/utils/db"

const BATCH_SIZE = 1000

const main = async () => {
  let batch
  let updates = []

  do {
    batch = await sql`
      SELECT * FROM run
      WHERE type = 'llm'
      AND cost IS NULL
      AND prompt_tokens IS NOT NULL
      AND completion_tokens IS NOT NULL
      LIMIT ${BATCH_SIZE} 
    `

    console.log(`Calculating costs of ${batch.length} runs...`)

    if (batch.length === 0) {
      break
    }

    for (const run of batch) {
      process.stdout.write(`.`)
      const cost = calcRunCost(run)
      updates.push(sql`
        UPDATE run
        SET cost = ${cost}
        WHERE id = ${run.id}
      `)
    }

    await Promise.all(updates)

    console.log(`\nUpdated ${batch.length} runs.`)
  } while (batch.length === BATCH_SIZE)
}

await main()
