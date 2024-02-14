import sql from "@/src/utils/db"

export async function getDatasetById(datasetId: string) {
  const rows = await sql`
    select
      d.id as id,
      d.project_id as project_id,
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

  return dataset
}

// TODO: refacto?
export async function getDatasetBySlug(slug: string, projectId: string) {
  const rows = await sql`
    select
      d.id as id,
      d.project_id as project_id,
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
      d.slug = ${slug}
      and d.project_id = ${projectId}
    `

  const { id, ownerId } = rows[0]
  const dataset = {
    id,
    slug,
    ownerId,
    projectId,
    prompts: [],
  }

  function replaceVariables(message, variables) {
    return message.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || "")
  }

  for (const { promptMessages, variables, idealOutput } of rows) {
    const prompt = {
      messages: promptMessages.map((message) => ({
        content: replaceVariables(message.content, variables),
        role: message.role,
      })),
      idealOutput,
    }
    dataset.prompts.push(prompt)
  }

  return dataset
}
