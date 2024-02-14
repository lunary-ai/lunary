import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { z } from "zod"
import { getDataset } from "./utils"

const datasets = new Router({
  prefix: "/datasets",
})

datasets.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      d.id, 
      d.created_at, 
      d.updated_at, 
      a.name as owner_name,
      d.slug,
      d.project_id,
      (select count(*) from dataset_prompt where dataset_id = d.id) as prompt_count 
    from
      dataset d
      left join account a on a.id = d.owner_id
      left join dataset_prompt as dp on dp.dataset_id = dp.id
    where
      project_id = ${projectId}
    order by
      updated_at desc
  `

  ctx.body = rows
})

datasets.get("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params

  const dataset = await getDataset(id)
  if (dataset.projectId !== projectId) {
    ctx.throw(401, "Not Authorized")
  }

  ctx.body = dataset
})

datasets.post("/", async (ctx: Context) => {
  //TODO: full zod
  const { projectId, userId } = ctx.state
  const body = z.object({
    slug: z.string(),
  })

  const { slug } = body.parse(ctx.request.body)
  console.log(ctx.request.body)
  const { prompts } = ctx.request.body

  const [insertedDataset] = await sql`
    insert into dataset ${sql({
      slug,
      ownerId: userId,
      projectId,
    })} returning *
  `

  for (const { messages, variations } of prompts) {
    const [insertedPrompt] = await sql`insert into dataset_prompt 
    ${sql({
      datasetId: insertedDataset.id,
      messages,
    })} 
    returning *`
    for (const variation of variations) {
      const variationToInsert = {
        promptId: insertedPrompt.id,
        variables: variation.variables,
        context: variation.context,
        idealOutput: variation.idealOutput,
      }

      await sql`insert into dataset_prompt_variation ${sql(variationToInsert)} returning *`
    }
  }

  ctx.status = 201
  ctx.body = { datasetId: insertedDataset.id }
})

// datasets.post("/:id/runs", async (ctx: Context) => {
//   const { projectId, id } = ctx.params
//   const { run } = ctx.request.body as {
//     run: {
//       input: any
//       output: any
//     }
//   }

//   // insert into jsonb[] runs

//   await sql`
//     update dataset
//     set runs = runs || ${sql.json(run)}, updated_at = now()
//     where project_id = ${projectId} and id = ${id}
//   `

//   ctx.status = 201
// })

// datasets.del("/:id/runs/:index", async (ctx: Context) => {
//   const { projectId, id, index } = ctx.params

//   // remove from jsonb[] from the run at index
//   await sql`
//     update dataset
//     set runs = runs - ${index}, updated_at = now()
//     where project_id = ${projectId} and id = ${id}
//   `

//   ctx.status = 200
// })

export default datasets
