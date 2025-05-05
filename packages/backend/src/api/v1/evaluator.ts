import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";

const evaluators = new Router({
  prefix: "/evaluators",
});

// TODO: access control
// TODO: route to get the number of runs checks are applied to, for new evaluators
// TODO: proper schema validation for params and filters

evaluators.get(
  "/",
  checkAccess("evaluations", "list"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;

    let evaluators =
      await sql`select * from evaluator where project_id = ${projectId}`;

    ctx.body = evaluators;
  },
);

evaluators.get("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id: evaluatorId } = ctx.params;

  const [evaluator] = await sql`
    select  
      *
    from
      evaluator
    where
      id = ${evaluatorId}
      and project_id = ${projectId}
  `;

  // TODO: return number of runs the evaluator will be applied to

  ctx.body = evaluator;
});

evaluators.post("/", async (ctx: Context) => {
  const requestBody = z.object({
    ownerId: z.string().optional(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    type: z.string(),
    mode: z.string(),
    params: z.record(z.any()),
    filters: z.array(z.any()),
  });

  const { projectId } = ctx.state;
  const evaluator = requestBody.parse(ctx.request.body);

  // TODO: do not allow insert if the (project_id, slug) already exist (+ add constraint in db)
  const [insertedEvaluator] = await sql`
    insert into evaluator ${sql({
      ...evaluator,
      projectId,
    })} 
    returning *
  `;

  ctx.body = insertedEvaluator;
});

evaluators.patch("/:id", async (ctx: Context) => {
  const requestBody = z.object({
    name: z.string(),
    description: z.string().optional(),
    type: z.string(),
    mode: z.string(),
    params: z.record(z.any()),
    filters: z.array(z.any()),
  });

  const { projectId } = ctx.state;
  const { id: evaluatorId } = ctx.params;
  const evaluator = requestBody.parse(ctx.request.body);

  const [updatedEvaluator] = await sql`
    update 
      evaluator 
    set
      ${sql(clearUndefined({ ...evaluator, updatedAt: new Date() }))}
    where 
      project_id = ${projectId}
      and id = ${evaluatorId}
    returning *
  `;

  ctx.body = updatedEvaluator;
});

evaluators.delete(
  "/:id",
  checkAccess("evaluations", "delete"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id: evaluatorId } = ctx.params;

    await sql`
    delete 
      from evaluator 
    where 
      project_id = ${projectId}
      and id = ${evaluatorId}
    returning *
  `;

    ctx.status = 200;
  },
);

export default evaluators;
