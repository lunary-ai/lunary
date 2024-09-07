import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";

const models = new Router({
  prefix: "/models",
});

const ModelSchema = z.object({
  name: z.string().min(1),
  pattern: z.string().min(1),
  unit: z.enum(["TOKENS", "CHARACTERS", "MILLISECONDS"]),
  inputCost: z.number().min(0),
  outputCost: z.number().min(0),
  tokenizer: z.string().optional(),
  startDate: z.coerce.date().optional(),
});

models.get("/", checkAccess("logs", "list"), async (ctx: Context) => {
  const { orgId } = ctx.state;

  ctx.body = await sql`select * from model_mapping
        where org_id = ${orgId} or org_id is null
        order by updated_at desc`;
});

models.post("/", async (ctx: Context) => {
  const { orgId } = ctx.state;

  const validatedData = ModelSchema.parse(ctx.request.body);

  const [insertedModel] = await sql`
    insert into model_mapping ${sql(
      clearUndefined({
        ...validatedData,
        orgId,
      }),
    )}
    returning *
  `;
  ctx.body = insertedModel;
});

models.patch("/:id", async (ctx: Context) => {
  const { orgId } = ctx.state;
  const { id } = ctx.params;

  const validatedData = ModelSchema.partial().parse(ctx.request.body);

  const [updatedModel] = await sql`
    update model_mapping
    set ${sql(clearUndefined({ ...validatedData, updatedAt: new Date() }))}
    where org_id = ${orgId}
    and id = ${id}
    returning *
  `;
  ctx.body = updatedModel;
});

models.delete("/:id", checkAccess("logs", "delete"), async (ctx: Context) => {
  const { orgId } = ctx.state;
  const { id } = ctx.params;

  await sql`
    delete from model_mapping
    where org_id = ${orgId}
    and id = ${id}
    returning *
  `;

  ctx.status = 200;
});

export default models;
