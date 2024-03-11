import sql from "@/src/utils/db"
import { compilePrompt, compileTextTemplate } from "@/src/utils/playground"

export async function getDatasetById(datasetId: string, projectId: string) {
  const [dataset] =
    await sql`select * from dataset where  id = ${datasetId} and project_id = ${projectId}`

  if (!dataset) {
    throw new Error("Dataset not found")
  }

  dataset.prompts =
    await sql`select * from dataset_prompt where dataset_id = ${datasetId} order by created_at asc`

  for (const prompt of dataset.prompts) {
    prompt.variations =
      await sql`select * from dataset_prompt_variation where prompt_id = ${prompt.id} order by created_at asc`
  }

  return dataset
}

// TODO: refacto?
export async function getDatasetBySlug(slug: string, projectId: string) {
  const rows = await sql`
    select
      d.id as id,
      d.format as format,
      d.project_id as project_id,
      d.slug as slug,
      p.id as prompt_id,
      d.owner_id as owner_id,
      p.messages as prompt_messages,
      pv.id as variation_id,
      pv.variables,
      pv.context,
      pv.ideal_output,
      pv.context
    from
      dataset d 
      left join dataset_prompt p on d.id = p.dataset_id
      left join dataset_prompt_variation pv on pv.prompt_id = p.id
    where 
      d.slug = ${slug}
      and d.project_id = ${projectId}
    order by
      p.created_at asc,
      pv.created_at asc
    `

  const { id, ownerId } = rows[0]
  const dataset = {
    id,
    slug,
    ownerId,
    projectId,
    items: [],
  }

  for (const { promptMessages, variables, idealOutput, context } of rows) {
    const item = {
      input:
        typeof promptMessages === "string"
          ? compileTextTemplate(promptMessages, variables)
          : compilePrompt(promptMessages, variables),
      idealOutput,
      context,
    }
    dataset.items.push(item)
  }

  return dataset
}
