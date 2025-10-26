import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";
import { checkOrgBetaAccess } from "@/src/utils/org";
import {
  BUILTIN_EVALUATOR_TYPES,
  BuiltinEvaluatorType,
} from "shared";

const isBuiltinType = (type: string): type is BuiltinEvaluatorType =>
  BUILTIN_EVALUATOR_TYPES.includes(type as BuiltinEvaluatorType);

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
    const { projectId, orgId } = ctx.state;
    const kindQuery = ctx.query?.kind;
    const kindFilter =
      typeof kindQuery === "string" && kindQuery.length ? kindQuery : undefined;

    const hasOrgBetaAccess = await checkOrgBetaAccess(orgId);

    let evaluators =
      await sql`select * from evaluator where project_id = ${projectId}`;

    if (kindFilter === "builtin") {
      evaluators = evaluators.filter((ev: any) => ev.kind === "builtin");
    } else if (kindFilter === "custom") {
      evaluators = evaluators.filter((ev: any) => ev.kind !== "builtin");
    }

    if (!hasOrgBetaAccess) {
      evaluators = evaluators.filter((ev: any) => ev.type !== "intent");
    }

    ctx.body = evaluators;
  },
);

evaluators.get("/:id", async (ctx: Context) => {
  const { projectId, orgId } = ctx.state;
  const hasOrgBetaAccess = await checkOrgBetaAccess(orgId);
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

  if (!evaluator) {
    ctx.body = evaluator;
    return;
  }

  if (evaluator.type === "intent" && !hasOrgBetaAccess) {
    ctx.throw(404, "Evaluator not found");
  }

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
  const hasOrgBetaAccess = await checkOrgBetaAccess(ctx.state.orgId);

  if (evaluator.type === "intent" && !hasOrgBetaAccess) {
    ctx.throw(403, "Intent evaluators require beta access.");
  }

  if (isBuiltinType(evaluator.type)) {
    ctx.throw(400, "Builtin evaluators cannot be created manually.");
  }

  // TODO: do not allow insert if the (project_id, slug) already exist (+ add constraint in db)
  const [insertedEvaluator] = await sql`
    insert into evaluator ${sql({
      ...evaluator,
      projectId,
      kind: "custom",
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

  const { projectId, orgId } = ctx.state;
  const { id: evaluatorId } = ctx.params;
  const evaluator = requestBody.parse(ctx.request.body);
  const hasOrgBetaAccess = await checkOrgBetaAccess(orgId);

  if (evaluator.type === "intent" && !hasOrgBetaAccess) {
    ctx.throw(403, "Intent evaluators require beta access.");
  }

  const [existingEvaluator] = await sql<{
    kind: string;
    type: string;
    filters: any;
  }[]>`
    select kind, type, filters
    from evaluator
    where project_id = ${projectId}
      and id = ${evaluatorId}
  `;

  if (!existingEvaluator) {
    ctx.throw(404, "Evaluator not found");
  }

  if (isBuiltinType(evaluator.type) && existingEvaluator.kind !== "builtin") {
    ctx.throw(400, "Cannot convert a custom evaluator into a builtin evaluator.");
  }

  if (existingEvaluator.kind === "builtin") {
    const [updatedBuiltinEvaluator] = await sql`
      update 
        evaluator 
      set
        ${sql(
          clearUndefined({
            name: evaluator.name,
            description: evaluator.description,
            params: evaluator.params,
            mode: evaluator.mode,
            updatedAt: new Date(),
          }),
        )}
      where 
        project_id = ${projectId}
        and id = ${evaluatorId}
      returning *
    `;

    ctx.body = updatedBuiltinEvaluator;
    return;
  }

  if (isBuiltinType(evaluator.type)) {
    ctx.throw(400, "Custom evaluators must use non-builtin types.");
  }

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

evaluators.post("/:id/recluster", async (ctx: Context) => {
  const { projectId, orgId } = ctx.state;
  const { id: evaluatorId } = ctx.params;

  const bodySchema = z.object({
    maxIntents: z.coerce.number().int().min(1).max(100).optional(),
  });

  const rawBody = ctx.request.body ?? {};
  const parsedPayload = bodySchema.parse(
    rawBody && typeof rawBody === "object" && "arg" in rawBody
      ? ((rawBody as any).arg ?? {})
      : rawBody,
  );

  const [evaluator] = await sql<
    {
      id: string;
      type: string;
      params: any;
      name: string;
      orgId: string;
    }[]
  >`
    select
      e.id,
      e.type,
      e.params,
      e.name,
      p.org_id as "orgId"
    from
      evaluator e
      join project p on e.project_id = p.id
    where
      e.id = ${evaluatorId}
      and e.project_id = ${projectId}
  `;

  if (!evaluator) {
    ctx.throw(404, "Evaluator not found");
  }

  if (evaluator.type !== "intent") {
    ctx.throw(
      400,
      "Intent clustering is only available for intent evaluators.",
    );
  }

  const hasOrgBetaAccess = await checkOrgBetaAccess(orgId);
  if (!hasOrgBetaAccess) {
    ctx.throw(403, "Intent evaluators require beta access.");
  }

  const maxIntents = Number(
    parsedPayload.maxIntents ?? evaluator.params?.maxIntents ?? 10,
  );

  if (!Number.isFinite(maxIntents) || maxIntents < 1) {
    ctx.throw(400, "Invalid max intents value.");
  }

  const jobType = `intent-recluster:${evaluatorId}`;
  const jobPayload = {
    evaluatorId,
    evaluatorName: evaluator.name,
    maxIntents,
  };

  const insertedJob = await sql<{ id: string }[]>`
    insert into 
      _job (org_id, type, status, payload)
    values 
      (${evaluator.orgId}, ${jobType}, 'pending', ${sql.json(jobPayload)})
    on conflict (org_id, type)
      where status in ('pending','running')
      do nothing
    returning id
  `;

  let jobId: string | undefined = insertedJob[0]?.id;

  if (!jobId) {
    const existing = await sql<{ id: string }[]>`
      select
        id
      from
        _job
      where
        org_id = ${evaluator.orgId}
        and type = ${jobType}
      order by
        created_at desc
      limit 1
    `;
    jobId = existing[0]?.id;
  }

  if (!jobId) {
    ctx.throw(500, "Unable to enqueue intent reclustering job");
  }

  ctx.status = 202;
  ctx.body = {
    jobId,
    status: "queued",
  };
});

evaluators.delete(
  "/:id",
  checkAccess("evaluations", "delete"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id: evaluatorId } = ctx.params;

    const [targetEvaluator] = await sql<{ kind: string }[]>`
      select kind
      from evaluator
      where project_id = ${projectId} and id = ${evaluatorId}
    `;

    if (!targetEvaluator) {
      ctx.throw(404, "Evaluator not found");
    }

    if (targetEvaluator.kind === "builtin") {
      ctx.throw(400, "Builtin evaluators cannot be deleted.");
    }

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
