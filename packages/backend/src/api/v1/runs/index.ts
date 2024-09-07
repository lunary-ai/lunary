import sql from "@/src/utils/db";
import { Context } from "koa";
import Router from "koa-router";

import ingest from "./ingest";
import { fileExport } from "./export";
import { Feedback, deserializeLogic } from "shared";
import { convertChecksToSQL } from "@/src/utils/checks";
import { checkAccess } from "@/src/utils/authorization";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";

const runs = new Router({
  prefix: "/runs",
});

interface Query {
  type?: "llm" | "trace" | "thread";
  search?: string;
  models?: string[];
  tags?: string[];
  tokens?: string;
  exportType?: "csv" | "jsonl";
  minDuration?: string;
  maxDuration?: string;
  startTime?: string;
  endTime?: string;
  parentRunId?: string;
  limit?: string;
  page?: string;
  order?: string;
  sortField?: string;
  sortDirection?: string;
}

function processInput(input: unknown) {
  if (
    input &&
    typeof input === "object" &&
    Object.keys(input).length === 1 &&
    input.hasOwnProperty("input")
  ) {
    return input.input;
  }

  return input;
}

function processOutput(output: unknown) {
  if (
    output &&
    typeof output === "object" &&
    Object.keys(output).length === 1 &&
    output.hasOwnProperty("output")
  ) {
    return output.output;
  }

  return output;
}

function processParams(params: any) {
  if (!params) return {};
  try {
    // handles tools received as string (eg. litellm)
    if (params.tools && typeof params.tools === "string") {
      params.tools = JSON.parse(jsonrepair(params.tools));
    }
  } catch (e) {
    console.error(e);
    console.error("Error parsing tools");
  }
  return params;
}

function formatRun(run: any) {
  const formattedRun = {
    id: run.id,
    projectId: run.projectId,
    isPublic: run.isPublic,
    feedback: run.feedback,
    parentFeedback: run.parentFeedback,

    type: run.type,
    name: run.name,
    createdAt: run.createdAt,
    endedAt: run.endedAt,
    duration: run.duration,
    templateVersionId: run.templateVersionId,
    templateSlug: run.templateSlug,
    cost: run.cost,
    tokens: {
      completion: run.completionTokens,
      prompt: run.promptTokens,
      total: run.completionTokens + run.promptTokens,
    },
    tags: run.tags,
    input: processInput(run.input),
    output: processOutput(run.output),
    error: run.error,
    status: run.status,
    siblingRunId: run.siblingRunId,
    params: processParams(run.params),
    metadata: run.metadata,
    user: run.externalUserId && {
      id: run.externalUserId,
      externalId: run.userExternalId,
      createdAt: run.userCreatedAt,
      lastSeen: run.userLastSeen,
      props: run.userProps,
    },
    traceId: run.rootParentRunId,
  };

  try {
    // TODO: put in process input function
    if (Array.isArray(formattedRun.input)) {
      for (const message of formattedRun.input) {
        message.enrichments = [];
      }
    } else if (formattedRun.input && typeof formattedRun.input === "object") {
      formattedRun.input.enrichments = [];
    }

    if (Array.isArray(formattedRun.output)) {
      for (const message of formattedRun.output) {
        message.enrichments = [];
      }
    } else if (formattedRun.output && typeof formattedRun.output === "object") {
      formattedRun.output.enrichments = [];
    }

    if (formattedRun.error && typeof formattedRun.error === "object") {
      formattedRun.error.enrichments = [];
    }

    for (const {
      result,
      evaluatorType,
      evaluatorId,
    } of run.evaluationResults) {
      if (!result?.input || !result?.output || !result?.error) {
        continue;
      }

      if (Array.isArray(formattedRun.input)) {
        for (let i = 0; i < formattedRun.input.length; i++) {
          const message = formattedRun.input[i];
          if (typeof message === "object") {
            message.enrichments.push({
              result: result.input[i],
              type: evaluatorType,
              id: evaluatorId,
            });
          }
        }
      } else if (formattedRun.input && typeof formattedRun.input === "object") {
        formattedRun.input.enrichments.push({
          result: result.input[0],
          type: evaluatorType,
          id: evaluatorId,
        });
      }

      if (Array.isArray(formattedRun.output)) {
        for (let i = 0; i < formattedRun.output.length; i++) {
          const message = formattedRun.output[i];
          if (typeof message === "object") {
            message.enrichments.push({
              result: result.output[i],
              type: evaluatorType,
              id: evaluatorId,
            });
          }
        }
      } else if (
        formattedRun.output &&
        typeof formattedRun.output === "object"
      ) {
        formattedRun.output.enrichments.push({
          result: result.output[0],
          type: evaluatorType,
          id: evaluatorId,
        });
      }

      if (formattedRun.error && typeof formattedRun.error === "object") {
        formattedRun.error.enrichments.push({
          result: result.error[0],
          type: evaluatorType,
          id: evaluatorId,
        });
      }
    }
    // TODO: put in an array nammed enrichment instead
    for (let evaluationResult of run.evaluationResults || []) {
      formattedRun[`enrichment-${evaluationResult.evaluatorId}`] =
        evaluationResult;
    }
  } catch (error) {
    console.error(error);
  }

  return formattedRun;
}

runs.use("/ingest", ingest.routes());

runs.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const queryString = ctx.querystring;
  const deserializedChecks = deserializeLogic(queryString);

  const filtersQuery =
    deserializedChecks?.length && deserializedChecks.length > 1 // first is always ["AND"]
      ? convertChecksToSQL(deserializedChecks)
      : sql`r.type = 'llm'`; // default to type llm

  const {
    limit = "50",
    page = "0",
    parentRunId,
    exportType,
    sortField,
    sortDirection,
  } = ctx.query as Query;

  let parentRunCheck = sql``;
  if (parentRunId) {
    parentRunCheck = sql`and parent_run_id = ${parentRunId}`;
  }

  const sortMapping = {
    createdAt: "r.created_at",
    duration: "r.duration",
    tokens: "total_tokens",
    cost: "r.cost",
  };
  let orderByClause = `r.created_at desc nulls last`;
  if (sortField && sortField in sortMapping) {
    const direction = sortDirection === "desc" ? `desc` : `asc`;
    orderByClause = `${sortMapping[sortField]} ${direction} nulls last`;
  }

  const rows = await sql`
    with runs as (
      select distinct
        r.*,
        (r.prompt_tokens + r.completion_tokens) as total_tokens,
        eu.id as user_id,
        eu.external_id as user_external_id,
        eu.created_at as user_created_at,
        eu.last_seen as user_last_seen,
        eu.props as user_props,
        t.slug as template_slug,
        rpfc.feedback as parent_feedback
    from
        public.run r
        left join external_user eu on r.external_user_id = eu.id
        left join run_parent_feedback_cache rpfc on r.id = rpfc.id
        left join template_version tv on r.template_version_id = tv.id
        left join template t on tv.template_id = t.id
        left join evaluation_result_v2 er on r.id = er.run_id
        left join evaluator e on er.evaluator_id = e.id
    where
        r.project_id = ${projectId}
        ${parentRunCheck}
        and (${filtersQuery})
    order by
        ${sql.unsafe(orderByClause)}  
    limit ${exportType ? 10000 : Number(limit)}
    offset ${Number(page) * Number(limit)}
  ),
  evaluation_results as (
    select
        r.id,
        coalesce(array_agg(
            jsonb_build_object(
                'evaluatorName', e.name,
                'evaluatorSlug', e.slug,
                'evaluatorType', e.type,
                'evaluatorId', e.id,
                'result', er.result, 
                'createdAt', er.created_at,
                'updatedAt', er.updated_at
            )
        ) filter (where er.run_id is not null), '{}') as evaluation_results
    from
            runs r
    left join evaluation_result_v2 er on r.id = er.run_id
    left join evaluator e on er.evaluator_id = e.id
    group by r.id
  )
  select
    r.*,
    er.evaluation_results
  from
    runs r
    left join evaluation_results er on r.id = er.id
  
  `;

  const runs = rows.map(formatRun);

  if (exportType) {
    return fileExport(runs, exportType, ctx);
  }

  const total = await sql`
    with runs as (
      select distinct on (r.id)
        r.*,
        eu.id as user_id,
        eu.external_id as user_external_id,
        eu.created_at as user_created_at,
        eu.last_seen as user_last_seen,
        eu.props as user_props,
        t.slug as template_slug,
        rpfc.feedback as parent_feedback
    from
        public.run r
        left join external_user eu on r.external_user_id = eu.id
        left join run_parent_feedback_cache rpfc on r.id = rpfc.id
        left join template_version tv on r.template_version_id = tv.id
        left join template t on tv.template_id = t.id
        left join evaluation_result_v2 er on r.id = er.run_id
        left join evaluator e on er.evaluator_id = e.id
    where
        r.project_id = ${projectId}
        ${parentRunCheck}
        and (${filtersQuery})
    )
    select
      count(*) 
    from
      runs;
  `;

  ctx.body = {
    total: +total[0].count,
    page: Number(page),
    limit: Number(limit),
    data: runs,
  };
});

// TODO: refactor with GET / by putting logic inside a function
runs.get("/count", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const queryString = ctx.querystring;
  const deserializedChecks = deserializeLogic(queryString);

  const filtersQuery =
    deserializedChecks?.length && deserializedChecks.length > 1 // first is always ["AND"]
      ? convertChecksToSQL(deserializedChecks)
      : sql`r.type = 'llm'`; // default to type llm

  const { parentRunId } = ctx.query as Query;

  let parentRunCheck = sql``;
  if (parentRunId) {
    parentRunCheck = sql`and parent_run_id = ${parentRunId}`;
  }

  const [{ count }] = await sql`
   with runs as (
      select distinct on (r.id)
        r.*,
        eu.id as user_id,
        eu.external_id as user_external_id,
        eu.created_at as user_created_at,
        eu.last_seen as user_last_seen,
        eu.props as user_props,
        t.slug as template_slug,
        rpfc.feedback as parent_feedback
    from
        public.run r
        left join external_user eu on r.external_user_id = eu.id
        left join run_parent_feedback_cache rpfc on r.id = rpfc.id
        left join template_version tv on r.template_version_id = tv.id
        left join template t on tv.template_id = t.id
        left join evaluation_result_v2 er on r.id = er.run_id
        left join evaluator e on er.evaluator_id = e.id
    where
        r.project_id = ${projectId}
        ${parentRunCheck}
        and (${filtersQuery})
    )
    select
      count(*) 
    from
      runs;
`;

  ctx.body = count;
});

runs.get("/usage", checkAccess("logs", "read"), async (ctx) => {
  const { projectId } = ctx.state;
  const { days, userId, daily } = ctx.query as {
    days: string;
    userId: string;
    daily: string;
  };

  const daysNum = parseInt(days);
  const userIdNum = userId ? parseInt(userId) : null;

  if (isNaN(daysNum) || (userId && isNaN(userIdNum))) {
    ctx.throw(400, "Invalid query parameters");
  }

  // TODO: probably cleaner to split this into two routes
  const runsUsage = await sql`
      select
          ${daily ? sql`date(run.created_at) as date,` : sql``}
          run.name,
          run.type,
          coalesce(sum(run.completion_tokens), 0)::int as completion_tokens,
          coalesce(sum(run.prompt_tokens), 0)::int as prompt_tokens,
          coalesce(sum(run.cost), 0)::float as cost,
          sum(case when run.status = 'error' then 1 else 0 end)::int as errors,
          sum(case when run.status = 'success' then 1 else 0 end)::int as success
      from
          run
      where
          run.project_id = ${projectId as string}
          and run.created_at >= now() - interval '1 day' * ${daysNum}
          ${userIdNum ? sql`and run.external_user_id = ${userIdNum}` : sql``}
          ${
            daily
              ? sql`and extract(epoch FROM (ended_at - created_at)) * 1000 >= 1000`
              : sql``
          }
      group by
          ${daily ? sql`date,` : sql``}
          run.name, 
          run.type
          `;

  ctx.body = runsUsage;
});

runs.get("/:id/public", async (ctx) => {
  const { id } = ctx.params;

  const [row] = await sql`
      select
        r.*,
        eu.id as user_id,
        eu.external_id as user_external_id,
        eu.created_at as user_created_at,
        eu.last_seen as user_last_seen,
        eu.props as user_props
      from
          run r
          left join external_user eu on r.external_user_id = eu.id
      where
          r.id = ${id}
          and r.is_public = true
      order by
          r.created_at desc
      limit 1`;

  if (!row) throw new Error("Run not found. It might not be public.");

  ctx.body = formatRun(row);
});

runs.get("/:id", async (ctx) => {
  const { id } = ctx.params;

  // Use orgId in case teammates shares URL to run and teammates is on another project.
  const { orgId } = ctx.state;

  const [row] = await sql`
     with recursive run_hierarchy as (
      select id, parent_run_id, id as root_parent_run_id
      from run
      where id = ${id} and parent_run_id is not null

      union all

      select r.id, r.parent_run_id, rh.root_parent_run_id
      from run r
      join run_hierarchy rh on r.id = rh.parent_run_id
    )
    select
      r.*,
      eu.id as user_id,
      eu.external_id as user_external_id,
      eu.created_at as user_created_at,
      eu.last_seen as user_last_seen,
      eu.props as user_props,
      (select id from run_hierarchy where parent_run_id is null) as root_parent_run_id,
      coalesce(array_agg(
        jsonb_build_object(
          'evaluatorName', e.name,
          'evaluatorSlug', e.slug,
          'evaluatorId', e.id,
          'evaluatorType', e.type,
          'result', er.result, 
          'createdAt', er.created_at,
          'updatedAt', er.updated_at
        )
      ) filter (where er.run_id is not null), '{}') as evaluation_results
    from
      run r
      left join external_user eu on r.external_user_id = eu.id
      left join run_parent_feedback_cache rpfc on r.id = rpfc.id
      left join template_version tv on r.template_version_id = tv.id
      left join template t on tv.template_id = t.id
      left join evaluation_result_v2 er on r.id = er.run_id 
      left join evaluator e on er.evaluator_id = e.id
    where
      r.project_id in (select id from project where org_id = ${orgId})
      and r.id = ${id}
    group by
      r.id,
      eu.id
    `;

  ctx.body = formatRun(row);
});

runs.patch("/:id", checkAccess("logs", "update"), async (ctx: Context) => {
  // TODO: tags and isPublic should probably have their own endpoint
  const requestBody = z.object({
    isPublic: z.boolean().optional(),
    tags: z.union([z.array(z.string()), z.null()]),
  });
  const { projectId } = ctx.state;
  const { id } = ctx.params;
  const { isPublic, tags } = requestBody.parse(ctx.request.body);

  let valuesToUpdate = {};
  if (isPublic !== undefined) {
    valuesToUpdate.isPublic = isPublic;
  }
  if (tags) {
    valuesToUpdate.tags = tags;
  }

  await sql`
      update
          run
      set ${sql(valuesToUpdate)}
      where
          project_id= ${projectId as string}
          and id = ${id}`;

  ctx.status = 200;
});

runs.patch(
  "/:id/feedback",
  checkAccess("logs", "update"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id } = ctx.params;
    const feedback = Feedback.parse(ctx.request.body);

    let [{ feedback: existingFeedback }] =
      (await sql`select feedback from run where id = ${id}`) || {};

    const newFeedback = { ...existingFeedback, ...feedback };

    await sql`
      update 
        run 
      set 
        feedback = ${sql.json(newFeedback)} 
      where 
        id = ${id} 
        and project_id = ${projectId}`;

    ctx.status = 200;
  },
);

runs.get("/:id/related", checkAccess("logs", "read"), async (ctx) => {
  const id = ctx.params.id;
  const { projectId } = ctx.state;

  const related = await sql`
    with recursive related_runs as (
      select 
        r1.*
      from 
        run r1
      where
        r1.id = ${id}
        and project_id = ${projectId}

      union all 

      select 
        r2.*
      from 
        run r2
        inner join related_runs rr on rr.id = r2.parent_run_id
  )
  select 
    rr.created_at, 
    rr.tags, 
    rr.project_id, 
    rr.id, 
    rr.status, 
    rr.name, 
    rr.ended_at, 
    rr.error, 
    rr.input, 
    rr.output, 
    rr.params, 
    rr.type, 
    rr.parent_run_id, 
    rr.completion_tokens, 
    rr.prompt_tokens, 
    rr.feedback, 
    rr.metadata
  from 
    related_runs rr;
  `;

  ctx.body = related;
});

// public route
runs.get("/:id/feedback", async (ctx) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;

  const [row] = await sql`
      select
          feedback
      from
          run
      where
          project_id = ${projectId} and id = ${id}
      limit 1`;

  if (!row) {
    ctx.throw(404, "Run not found");
  }

  ctx.body = row.feedback;
});

export default runs;
