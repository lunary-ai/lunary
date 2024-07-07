import { checkAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import { clearUndefined } from "@/src/utils/ingest"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { CheckLogic } from "shared"

const models = new Router({
  prefix: "/models",
})

models.get("/", checkAccess("logs", "list"), async (ctx: Context) => {
  const { orgId } = ctx.state

  ctx.body = await sql`select * from model_mapping
        where org_id = ${orgId} or org_id is null
        order by updated_at desc`
})

models.post("/", async (ctx: Context) => {
  const { orgId } = ctx.state

  const { name, pattern, unit, inputCost, outputCost, tokenizer, startDate } =
    ctx.request.body as {
      name: string
      pattern: string
      unit: string
      inputCost: number
      outputCost: number
      tokenizer: string
      startDate: Date
    }

  const [insertedModel] = await sql`
    insert into model_mapping ${sql({
      name,
      orgId,
      pattern,
      unit,
      inputCost,
      outputCost,
      tokenizer,
      startDate,
    })}
    returning *
  `
  ctx.body = insertedModel
})

models.patch("/:id", async (ctx: Context) => {
  const { orgId } = ctx.state
  const { id } = ctx.params
  const { name, pattern, unit, inputCost, outputCost, tokenizer, startDate } =
    ctx.request.body as {
      name: string
      pattern: string
      unit: string
      inputCost: number
      outputCost: number
      tokenizer: string
      startDate: Date
    }

  const [updatedModel] = await sql`
    update model_mapping
    set ${sql(clearUndefined({ name, pattern, unit, inputCost, outputCost, tokenizer, startDate, updatedAt: new Date() }))}
    where org_id = ${orgId}
    and id = ${id}
    returning *
  `
  ctx.body = updatedModel
})

models.delete("/:id", checkAccess("logs", "delete"), async (ctx: Context) => {
  const { orgId } = ctx.state
  const { id } = ctx.params

  await sql`
    delete from model_mapping
    where org_id = ${orgId}
    and id = ${id}
    returning *
  `

  ctx.status = 200
})

export default models
