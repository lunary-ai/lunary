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

/**
 * @openapi
 * components:
 *   schemas:
 *     Run:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         projectId:
 *           type: string
 *         isPublic:
 *           type: boolean
 *         feedback:
 *           $ref: '#/components/schemas/Feedback'
 *         parentFeedback:
 *           $ref: '#/components/schemas/Feedback'
 *         type:
 *           type: string
 *         name:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         endedAt:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: number
 *         templateVersionId:
 *           type: string
 *         templateSlug:
 *           type: string
 *         cost:
 *           type: number
 *         tokens:
 *           type: object
 *           properties:
 *             completion:
 *               type: number
 *             prompt:
 *               type: number
 *             total:
 *               type: number
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         input:
 *           type: object
 *         output:
 *           type: object
 *         error:
 *           type: object
 *         status:
 *           type: string
 *         siblingRunId:
 *           type: string
 *         params:
 *           type: object
 *         metadata:
 *           type: object
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             externalId:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *             lastSeen:
 *               type: string
 *               format: date-time
 *             props:
 *               type: object
 *         traceId:
 *           type: string
 *
 *     Feedback:
 *       type: object
 *       properties:
 *         score:
 *           type: number
 *         flags:
 *           type: array
 *           items:
 *             type: string
 *         comment:
 *           type: string
 */

const runs = new Router({
  prefix: "/runs",
});

interface Query {
  type?: "llm" | "trace" | "thread";
  search?: string;
  models?: string[];
  tags?: string[];
  tokens?: string;
  exportType?: "trace" | "thread";
  exportFormat?: "csv" | "ojsonl" | "jsonl";
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
        if (message && typeof message === "object") {
          message.enrichments = [];
        }
      }
    } else if (formattedRun.input && typeof formattedRun.input === "object") {
      formattedRun.input.enrichments = [];
    }

    if (Array.isArray(formattedRun.output)) {
      for (const message of formattedRun.output) {
        if (message && typeof message === "object") {
          message.enrichments = [];
        }
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
          if (message && typeof message === "object") {
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

/**
 * @openapi
 * /v1/runs:
 *   get:
 *     summary: Get runs
 *     tags: [Runs]
 *     description: |
 *       The Runs API endpoint allows you to retrieve data about specific runs from your Lunary application.
 *
 *       The most common run types are 'llm', 'agent', 'chain', 'tool', 'thread' and 'chat'.
 *
 *       It supports various filters to narrow down the results according to your needs.
 *
 *       This endpoint supports GET requests and expects query parameters for filtering the results.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [llm, trace, thread]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: models
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: tokens
 *         schema:
 *           type: string
 *       - in: query
 *         name: exportType
 *         schema:
 *           type: string
 *           enum: [csv, jsonl]
 *       - in: query
 *         name: minDuration
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxDuration
 *         schema:
 *           type: string
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *       - in: query
 *         name: parentRunId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Run'
 *         examples:
 *           application/json:
 *             value:
 *               total: 200
 *               page: 1
 *               limit: 10
 *               data:
 *                 - type: llm
 *                   name: gpt-4o
 *                   createdAt: "2024-01-01T12:00:00Z"
 *                   endedAt: "2024-01-01T12:00:03Z"
 *                   duration: 3
 *                   tokens:
 *                     completion: 100
 *                     prompt: 50
 *                     total: 150
 *                   feedback: null
 *                   status: success
 *                   tags: ["example"]
 *                   templateSlug: example-template
 *                   templateVersionId: 1234
 *                   input:
 *                     - role: user
 *                       content: Hello world!
 *                   output:
 *                     - role: assistant
 *                       content: Hello. How are you?
 *                   error: null
 *                   user:
 *                     id: "11111111"
 *                     externalId: user123
 *                     createdAt: "2021-12-01T12:00:00Z"
 *                     lastSeen: "2022-01-01T12:00:00Z"
 *                     props:
 *                       name: Jane Doe
 *                       email: user1@apple.com
 *                   cost: 0.05
 *                   params:
 *                     temperature: 0.5
 *                     maxTokens: 100
 *                     tools: []
 *                   metadata: null
 */
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
    exportFormat,
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

  const query = sql`
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
    from runs r
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

  if (exportFormat) {
    const cursor = query.cursor();
    return fileExport(
      { ctx, sql, cursor, formatRun, projectId },
      exportFormat,
      exportType,
    );
  }

  const rows = await query;
  const runs = rows.map(formatRun);

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

/**
 * @openapi
 * /v1/runs/usage:
 *   get:
 *     tags: [Runs]
 *     summary: Get run usage statistics
 *     description: Retrieve usage statistics for runs
 *     parameters:
 *       - in: query
 *         name: days
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: daily
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   completion_tokens:
 *                     type: integer
 *                   prompt_tokens:
 *                     type: integer
 *                   cost:
 *                     type: number
 *                   errors:
 *                     type: integer
 *                   success:
 *                     type: integer
 *       400:
 *         description: Invalid query parameters
 */
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

/**
 * @openapi
 * /v1/runs/{id}:
 *   get:
 *     summary: Get a specific run
 *     description: Retrieve detailed information about a specific run by its ID.
 *     tags: [Runs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Run'
 *       404:
 *         description: Run not found
 */
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

  if (!row) {
    return ctx.throw(404, "Run not found");
  }

  ctx.body = formatRun(row);
});

/**
 * @openapi
 * /v1/runs/{id}:
 *   patch:
 *     summary: Update a run
 *     description: This endpoint allows updating the public visibility status and tags of a run. The `isPublic` field can be set to true or false to change the run's visibility. The `tags` field can be updated with an array of strings or set to null to remove all tags.
 *     tags: [Runs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPublic:
 *                 type: boolean
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             isPublic: true
 *             tags: ["important", "customer-facing"]
 *     responses:
 *       200:
 *         description: Successful update
 *       400:
 *         description: Invalid input
 */
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

/**
 * @openapi
 * /v1/runs/{id}/feedback:
 *   patch:
 *     summary: Update run feedback
 *     tags: [Runs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Feedback'
 *           example:
 *             thumb: "up"
 *             comment: "This response was very helpful!"
 *     responses:
 *       200:
 *         description: Feedback updated successfully
 *       400:
 *         description: Invalid input
 */
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

  const relatedRuns = await sql`
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
    coalesce(rr.cost, 0) as cost,
    rr.feedback, 
    rr.metadata
  from 
    related_runs rr;
  `;

  ctx.body = relatedRuns;
});

runs.get("/:id/feedback", async (ctx) => {
  const { id } = ctx.params;

  const [row] = await sql`
    select
      r.feedback
    from
      run r
    where
      r.id = ${id}
  `;

  if (!row) return ctx.throw(404, "Run not found");

  ctx.body = row.feedback;
});

/**
 * @openapi
 * /v1/runs/{id}:
 *   delete:
 *     summary: Delete a run
 *     description: Delete a specific run by its ID. This action is irreversible.
 *     tags: [Runs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Run successfully deleted
 *       403:
 *         description: Forbidden - User doesn't have permission to delete runs
 *       404:
 *         description: Run not found
 */
runs.delete("/:id", checkAccess("logs", "delete"), async (ctx: Context) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);
  const { projectId } = ctx.state;

  const [deletedRun] = await sql`
    delete 
      from run
    where 
      id = ${id}
      and project_id = ${projectId}
    returning id
  `;

  if (!deletedRun) {
    ctx.status = 404;
    return;
  }

  ctx.status = 200;
});

export default runs;
