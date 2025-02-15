import sql from "@/src/utils/db";
import Router from "koa-router";

import { checkAccess } from "@/src/utils/authorization";
import { convertChecksToSQL } from "@/src/utils/checks";
import { jsonrepair } from "jsonrepair";
import { Feedback, Score, deserializeLogic } from "shared";
import { z } from "zod";
import { fileExport } from "./export";
import ingest from "./ingest";

import Context from "@/src/utils/koa";
import crypto from "crypto";
import { getRelatedRuns } from "./queries";

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
  token?: string;
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

export function formatRun(run: any) {
  const formattedRun = {
    id: run.id,
    projectId: run.projectId,
    isPublic: run.isPublic,
    feedback: run.feedback,
    parentFeedback: run.parentFeedback,
    feedbacks: run.feedbacks,

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
    scores: run.scores,
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

// TODO: should not pass the context to this function
function getRunQuery(ctx: Context, isExport = false) {
  const { projectId } = ctx.state;

  const queryString = ctx.querystring;
  const deserializedChecks = deserializeLogic(queryString);

  const filtersQuery =
    deserializedChecks?.length && deserializedChecks.length > 1 // first is always ["AND"]
      ? convertChecksToSQL(deserializedChecks)
      : sql`r.type = 'llm'`; // default to type llm

  const {
    type,
    limit = "50",
    page = "0",
    parentRunId,
    sortField,
    sortDirection,
  } = ctx.query as Query;

  let parentRunCheck = sql``;
  if (parentRunId) {
    parentRunCheck = sql`and parent_run_id = ${parentRunId}`;
  }

  const sortMapping: { [index: string]: string } = {
    createdAt: "r.created_at",
    duration: "r.duration",
    tokens: "total_tokens",
    cost: "r.cost",
  };
  let orderByClause = `r.created_at desc nulls last`;
  if (sortField && sortField in sortMapping) {
    const direction = sortDirection === "desc" ? `desc` : `asc`;
    orderByClause = `${sortMapping[sortField]} ${direction}`;
  }

  const query = sql`
    select 
      r.*,
      (r.prompt_tokens + r.completion_tokens) as total_tokens,
      eu.id as user_id,
      eu.external_id as user_external_id,
      eu.created_at as user_created_at,
      eu.last_seen as user_last_seen,
      eu.props as user_props,
      t.slug as template_slug,
      coalesce(er.results, '[]') as evaluation_results,
      parent_feedback.feedback as parent_feedback,
      chat_feedbacks.feedbacks as feedbacks,
      coalesce(scores, '[]'::json) as scores
    from
      public.run r
      left join external_user eu on r.external_user_id = eu.id
      left join template_version tv on r.template_version_id = tv.id
      left join template t on tv.template_id = t.id
      left join lateral (
        select 
          json_agg(jsonb_build_object('evaluatorName', e.name, 'evaluatorSlug', e.slug, 'evaluatorType', e.type, 'evaluatorId', e.id, 'result', er.result)) as results
        from 
          evaluation_result_v2 er
          left join evaluator e on er.evaluator_id = e.id
        where 
          er.run_id = r.id
        group by
          r.id
      ) as er on true
      left join lateral (
        select 
          json_agg(jsonb_build_object('value', rs.value, 'label', rs.label, 'comment', rs.comment)) as scores
        from
          run_score rs
        where
          rs.run_id = r.id
        group by
          r.id
      ) as rs on true
      left join lateral (
				with recursive parent_runs as (
          select id, parent_run_id, feedback from run where id = r.id
					union all
					select r.id, r.parent_run_id, r.feedback
					from run r
					join parent_runs on parent_runs.parent_run_id = r.id
					where r.parent_run_id is not null and r.type = 'chat' 
				)
				select
					feedback
				from
					parent_runs
				where
					parent_runs.id != r.id
			) parent_feedback on true
      left join lateral (
        select
          json_agg(feedback) as feedbacks
        from
          run r2
        where
          r2.parent_run_id = r.id
          and r2.type = 'chat'
      ) as chat_feedbacks on true
    where
        r.project_id = ${projectId}
        ${parentRunCheck}
        and (${filtersQuery})
    order by
        ${sql.unsafe(orderByClause)}  
    limit ${isExport ? sql`all` : Number(limit)}
    offset ${Number(page) * Number(limit)}
  `;

  return { query, projectId, parentRunCheck, filtersQuery, page, limit };
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
  const { query, page, limit } = getRunQuery(ctx, false);

  const rows = await query;
  const runs = rows.map(formatRun);

  // TODO: improve this
  if (ctx.query.type === "llm") {
    for (const run of runs) {
      try {
        if (Array.isArray(run.input)) {
          run.input = run.input[run.input.length - 1];
        }
        if (
          typeof run.input === "object" &&
          typeof run.input.content === "string"
        ) {
          run.input.content = run.input.content.substring(0, 100);
        }
        if (
          typeof run.output === "object" &&
          typeof run.output?.content === "string"
        ) {
          run.output.content = run.output.content.substring(0, 100);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  ctx.body = {
    page: Number(page),
    limit: Number(limit),
    data: runs,
  };
});

// TODO: delete
runs.get("/count", async (ctx: Context) => {
  const { query } = getRunQuery(ctx);
  const total = await sql`select count(*) from (${query}) c`;
  ctx.body = +total[0].count;
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
          run.project_id = ${projectId}
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
      ) filter (where er.run_id is not null), '{}') as evaluation_results,
      coalesce(
          jsonb_agg(
            distinct jsonb_build_object(
              'value', rs.value,
              'label', rs.label,
              'comment', rs.comment
            )
          ) filter (where rs.run_id is not null),
          '[]'::jsonb
        ) as scores
    from
      run r
      left join run_score rs on r.id = rs.run_id
      left join external_user eu on r.external_user_id = eu.id
      left join template_version tv on r.template_version_id = tv.id
      left join template t on tv.template_id = t.id
      left join evaluation_result_v2 er on r.id = er.run_id 
      left join evaluator e on er.evaluator_id = e.id
    where
      r.project_id in (select id from project where org_id = ${orgId})
      and r.id = ${id}
    group by
      r.id,
      eu.id,
      rs.run_id
    `;

  if (!row) {
    return ctx.throw(404, "Run not found");
  }

  ctx.body = formatRun(row);
});

/**
 * @openapi
 * /v1/runs/{id}/visibility:
 *   patch:
 *     summary: Update run visibility
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
 *               visibility:
 *                 type: boolean
 *             example:
 *               visibility: true
 *     responses:
 *       200:
 *         description: Visibility updated successfully
 *       400:
 *         description: Invalid input
 */
runs.patch(
  "/:id/visibility",
  checkAccess("logs", "updateVisibility"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id } = ctx.params;
    const { visibility } = z
      .object({ visibility: z.boolean() })
      .parse(ctx.request.body);

    await sql`
      update run
      set is_public = ${visibility}
      where project_id = ${projectId}
          and id = ${id}`;

    ctx.status = 200;
  },
);

/**
 * @openapi
 * /v1/runs/{id}/tags:
 *   patch:
 *     summary: Update run tags
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               tags: ["example", "test"]
 *     responses:
 *       200:
 *         description: Tags updated successfully
 *       400:
 *         description: Invalid input
 */
runs.patch("/:id/tags", checkAccess("logs", "update"), async (ctx: Context) => {
  const requestBody = z.object({
    tags: z.union([z.array(z.string()), z.null()]),
  });

  const { projectId } = ctx.state;
  const { id } = ctx.params;
  const { tags } = requestBody.parse(ctx.request.body);

  await sql`
      update run
      set tags = ${tags}
      where project_id = ${projectId}
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
  checkAccess("logs", "update"), // TODO: should probably has its own permission
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

/**
 * @openapi
 * /v1/runs/{id}/score:
 *   patch:
 *     summary: Update run score
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
 *             $ref: '#/components/schemas/Score'
 *           example:
 *             label: "accuracy"
 *             value: 0.95
 *             comment: "High accuracy score"
 *     responses:
 *       200:
 *         description: Score updated successfully
 *       400:
 *         description: Invalid input
 */
runs.patch(
  "/:id/score",
  checkAccess("logs", "update"),
  async (ctx: Context) => {
    const { id: runId } = ctx.params;
    const { label, value, comment } = Score.parse(ctx.request.body);

    let [existingScore] =
      await sql`select * from run_score where run_id = ${runId} and label = ${label}`;

    if (!existingScore) {
      await sql`insert into run_score ${sql({ runId, label, value, comment })}`;
    } else {
      await sql`update run_score set ${sql({ label, value, comment })} where run_id = ${runId} and label = ${label}`;
    }

    ctx.status = 200;
  },
);

/**
 * @openapi
 * /v1/runs/{id}/related:
 *   get:
 *     summary: Get related runs
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
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Run'
 *       404:
 *         description: Run not found
 */
runs.get("/:id/related", checkAccess("logs", "read"), async (ctx) => {
  const id = ctx.params.id;
  const { projectId } = ctx.state;

  const relatedRuns = await getRelatedRuns(id, projectId);

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

/**
 * @openapi
 * /v1/runs/generate-export-token:
 *   post:
 *     summary: Generate an export token
 *     tags: [Runs]
 *     responses:
 *       200:
 *         description: Export token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
runs.post("/generate-export-token", async (ctx) => {
  const { userId } = ctx.state;
  const token = crypto.randomBytes(32).toString("hex");

  await sql`update account set export_single_use_token = ${token} where id = ${userId}`;

  ctx.body = { token };
});

/**
 * @openapi
 * /v1/runs/exports/{token}:
 *   get:
 *     summary: Export runs data
 *     tags: [Runs]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [llm, trace, thread]
 *       - in: query
 *         name: exportFormat
 *         required: true
 *         schema:
 *           type: string
 *           enum: [csv, jsonl, ojsonl]
 *     responses:
 *       200:
 *         description: Export successful
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Invalid token
 */
runs.get("/exports/:token", async (ctx) => {
  const { type, exportFormat } = z
    .object({
      type: z.union([
        z.literal("llm"),
        z.literal("trace"),
        z.literal("thread"),
      ]),
      exportFormat: z.union([
        z.literal("csv"),
        z.literal("jsonl"),
        z.literal("ojsonl"),
      ]),
    })
    .parse(ctx.query);
  const { token } = z.object({ token: z.string() }).parse(ctx.params);

  const [user] =
    await sql`select name from account where export_single_use_token = ${token}`;
  if (!user) {
    return ctx.throw(401, "Invalid token");
  }

  const { query, projectId } = getRunQuery(ctx, true);

  await fileExport(
    { ctx, sql, cursor: query.cursor(), formatRun, projectId },
    exportFormat,
    type,
  );

  await sql`update account set export_single_use_token = null where id = ${ctx.state.userId}`;
});

function buildBaseRunsQuery(ctx: Context) {
  const { projectId } = ctx.state;

  const queryString = ctx.querystring;
  const deserializedChecks = deserializeLogic(queryString);

  const filtersQuery =
    deserializedChecks?.length && deserializedChecks.length > 1
      ? convertChecksToSQL(deserializedChecks)
      : sql`(((r.type in ('agent','chain') and (parent_run_id is null OR EXISTS (SELECT 1 FROM run AS parent_run WHERE parent_run.id = r.parent_run_id AND parent_run.type = 'chat')))))`;

  const { parentRunId, sortField, sortDirection } = ctx.query as Query;

  const sortMapping: { [index: string]: string } = {
    createdAt: "r.created_at",
    duration: "r.duration",
    tokens: "(r.prompt_tokens + r.completion_tokens)",
    cost: "r.cost",
  };
  let orderByExpr = "r.created_at desc nulls last";
  if (sortField && sortMapping[sortField]) {
    const direction = sortDirection === "desc" ? "desc" : "asc";
    orderByExpr = `${sortMapping[sortField]} ${direction} nulls last`;
  }

  const coreQuery = sql`
    from 
      public.run r
      left join external_user eu on r.external_user_id = eu.id
      left join template_version tv ON r.template_version_id = tv.id
      left join template t on tv.template_id = t.id
      left join evaluation_result_v2 er ON r.id = er.run_id
      left join evaluator e on er.evaluator_id = e.id
    where r.project_id = ${projectId}
      and (${filtersQuery})
    order by ${sql.unsafe(orderByExpr)}
  `;

  return { coreQuery, orderByExpr };
}

runs.get("/:id/neighbors", async (ctx: Context) => {
  const { id } = ctx.params;
  const { coreQuery, orderByExpr } = buildBaseRunsQuery(ctx);

  const [row] = await sql`
    with ordered_runs as (
      select
        r.id,
        row_number() over (order by ${sql.unsafe(orderByExpr)}) as rn
      ${coreQuery} 
    ),
    neighbors AS (
      select
        id,
        lag(id)  over (order by rn) AS next_id,
        lead(id) OVER (order by rn) AS previous_id 
      FROM ordered_runs
    )
    select 
      previous_id, 
      next_id 
    from 
      neighbors
    where 
      id = ${id}
  `;

  ctx.body = {
    previousId: row?.previousId || null,
    nextId: row?.nextId || null,
  };
});

export default runs;
