import sql from "@/src/utils/db"

export async function getDataset(datasetId: string) {
  const rows = await sql`
    select
      d.id as id,
      d.slug as slug,
      p.id as prompt_id,
      d.owner_id as owner_id,
      p.messages as prompt_messages,
      pv.id as variation_id,
      pv.variables,
      pv.context,
      pv.ideal_output
    from
      dataset d 
      left join dataset_prompt p on d.id = p.dataset_id
      left join dataset_prompt_variation pv on pv.prompt_id = p.id
    where 
      d.id = ${datasetId}
    `

  const { id, slug, projectId, ownerId } = rows[0]
  console.log(rows)

  const dataset = {
    id,
    slug,
    ownerId,
    projectId,
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
  }

  console.log(dataset)

  return dataset
}
