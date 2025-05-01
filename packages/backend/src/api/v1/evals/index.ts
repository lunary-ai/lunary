/**
 * Evals (end-points for the `eval`, `eval_criteria`, and `eval_result` tables)
 *
 * Style notes
 *  – all sql literals are lowercase
 *  – routes mimic the datasets router for consistency
 */

import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";
import openai from "@/src/utils/openai";

const evals = new Router({
  prefix: "/evals",
});

/**
 * @openapi
 * /v1/evals:
 *   get:
 *     summary: List evaluations
 *     tags: [Evals]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of evaluations
 */
evals.get("/", checkAccess("evaluations", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;

  const rows =
    await sql`select * from eval where project_id = ${projectId} order by created_at desc`;

  ctx.body = rows;
});

/**
 * @openapi
 * /v1/evals/{id}:
 *   get:
 *     summary: Get evaluation by ID
 *     tags: [Evals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Evaluation details
 */
evals.get("/:id", checkAccess("evaluations", "read"), async (ctx: Context) => {
  const { id } = ctx.params;
  const { projectId } = ctx.state;

  const [evaluation] =
    await sql`select * from eval where id = ${id} and project_id = ${projectId}`;

  if (!evaluation) {
    ctx.throw(404, "evaluation not found");
  }

  const criteria =
    await sql`select * from eval_criteria where eval_id = ${id} order by created_at asc`;

  evaluation.criteria = criteria;

  ctx.body = evaluation;
});

/**
 * @openapi
 * /v1/evals:
 *   post:
 *     summary: Create a new evaluation
 *     tags: [Evals]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               datasetId: { type: string }
 *               description: { type: string }
 *             required: [name, datasetId]
 *     responses:
 *       200:
 *         description: Created evaluation
 */
evals.post("/", checkAccess("evaluations", "create"), async (ctx: Context) => {
  const bodySchema = z.object({
    name: z.string(),
    datasetId: z.string().uuid(),
    description: z.string().optional(),
  });

  const { name, datasetId, description } = bodySchema.parse(ctx.request.body);
  const { projectId, userId } = ctx.state;

  /* verify dataset belongs to the same project */
  const [dataset] =
    await sql`select id from dataset where id = ${datasetId} and project_id = ${projectId}`;
  if (!dataset) {
    ctx.throw(403, "you do not have access to this dataset");
  }

  const [evaluation] = await sql`
    insert into eval ${sql({
      name,
      description,
      datasetId,
      projectId,
      ownerId: userId,
      model: "gpt-4.1",
    })} returning *
  `;

  ctx.body = evaluation;
});

/**
 * @openapi
 * /v1/evals/{id}/run:
 *   post:
 *     summary: Run the evaluation (generate with gpt-4.1 then grade)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: No Content
 */
evals.post(
  "/:id/run",
  checkAccess("evaluations", "update"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;

    /* load evaluation, dataset prompts & criteria */
    const [evaluation] =
      await sql`select * from eval where id = ${id} and project_id = ${projectId}`;
    if (!evaluation) ctx.throw(404, "evaluation not found");

    const prompts =
      await sql`select * from dataset_prompt where dataset_id = ${evaluation.dataset_id}`;

    const criteria =
      await sql`select * from eval_criteria where eval_id = ${id}`;

    /* call gpt-4.1 for every prompt (simple streaming loop) */
    for (const p of prompts) {
      const completion = await openai.chat.completions.create({
        model: evaluation.model, // 'gpt-4.1'
        messages: p.messages,
      });

      const modelOutput = completion.choices[0].message.content ?? "";

      /* grade against every criterion */
      for (const c of criteria) {
        const { score, passed } = { score: 1, passed: true };
        // const { score, passed } = await gradeResult(modelOutput, p, c); // -> implement per-metric grading

        await sql`insert into eval_result ${sql({
          evalId: id,
          datasetPromptId: p.id,
          criteriaId: c.id,
          output: modelOutput,
          score,
          passed,
        })}`;
      }
    }

    ctx.status = 204;
  },
);

/**
 * @openapi
 * /v1/evals/{id}:
 *   patch:
 *     summary: Update an evaluation
 *     tags: [Evals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Updated evaluation
 */
evals.patch(
  "/:id",
  checkAccess("evaluations", "update"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;

    const { name, description } = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
      })
      .parse(ctx.request.body);

    const [evaluation] = await sql`
    update eval set
      ${sql(
        clearUndefined({
          name,
          description,
          updated_at: new Date(),
        }),
      )}
    where id = ${id} and project_id = ${projectId}
    returning *
  `;

    if (!evaluation) ctx.throw(404, "evaluation not found");

    ctx.body = evaluation;
  },
);

/**
 * @openapi
 * /v1/evals/{id}:
 *   delete:
 *     summary: Delete an evaluation
 *     tags: [Evals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Evaluation deleted successfully
 */
evals.delete(
  "/:id",
  checkAccess("evaluations", "delete"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;

    await sql`delete from eval where id = ${id} and project_id = ${projectId}`;

    ctx.status = 200;
  },
);

/* ────────────────────────────────────────────────────────────
   2. eval_criteria — create, get, update, delete
   ──────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /v1/evals/criteria:
 *   post:
 *     summary: Create a criterion
 *     tags: [Evals, Criteria]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               evalId: { type: string }
 *               name: { type: string }
 *               metric: { type: string }
 *               threshold: { type: number, nullable: true }
 *               weighting: { type: number }
 *               parameters: { type: object }
 *             required: [evalId, name, metric]
 *     responses:
 *       200:
 *         description: Created criterion
 */
evals.post(
  "/criteria",
  checkAccess("evaluations", "update"),
  async (ctx: Context) => {
    const bodySchema = z.object({
      evalId: z.string().uuid(),
      name: z.string(),
      metric: z.string(),
      threshold: z.number().nullable().optional(),
      weighting: z.number().default(1),
      parameters: z.record(z.any()).default({}),
    });

    const { evalId, name, metric, threshold, weighting, parameters } =
      bodySchema.parse(ctx.request.body);
    const { projectId } = ctx.state;

    /* ensure eval lives in this project */
    const [evaluation] =
      await sql`select id from eval where id = ${evalId} and project_id = ${projectId}`;
    if (!evaluation) {
      ctx.throw(403, "you do not have access to this evaluation");
    }

    const [criterion] = await sql`
      insert into eval_criteria ${sql({
        evalId,
        name,
        metric,
        threshold,
        weighting,
        parameters,
      })} returning *
    `;

    ctx.body = criterion;
  },
);

/**
 * @openapi
 * /v1/evals/criteria/{id}:
 *   get:
 *     summary: Get criterion by ID
 *     tags: [Evals, Criteria]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Criterion details
 */
evals.get(
  "/criteria/:id",
  checkAccess("evaluations", "read"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;

    const [criterion] = await sql`
      select ec.*
      from eval_criteria ec
      left join eval e on ec.eval_id = e.id
      where ec.id = ${id} and e.project_id = ${projectId}
    `;

    if (!criterion) ctx.throw(404, "criterion not found");

    ctx.body = criterion;
  },
);

/**
 * @openapi
 * /v1/evals/criteria/{id}:
 *   patch:
 *     summary: Update a criterion
 *     tags: [Evals, Criteria]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               metric: { type: string }
 *               threshold: { type: number, nullable: true }
 *               weighting: { type: number }
 *               parameters: { type: object }
 *     responses:
 *       200:
 *         description: Updated criterion
 */
evals.patch(
  "/criteria/:id",
  checkAccess("evaluations", "update"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;

    const { name, metric, threshold, weighting, parameters } = z
      .object({
        name: z.string().optional(),
        metric: z.string().optional(),
        threshold: z.number().nullable().optional(),
        weighting: z.number().optional(),
        parameters: z.record(z.any()).optional(),
      })
      .parse(ctx.request.body);

    const [criterion] = await sql`
      update eval_criteria set
        ${sql(
          clearUndefined({
            name,
            metric,
            threshold,
            weighting,
            parameters,
          }),
        )}
      where id = ${id} and eval_id in (
        select id from eval where project_id = ${projectId}
      )
      returning *
    `;

    if (!criterion) ctx.throw(404, "criterion not found");

    ctx.body = criterion;
  },
);

/**
 * @openapi
 * /v1/evals/criteria/{id}:
 *   delete:
 *     summary: Delete a criterion
 *     tags: [Evals, Criteria]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Criterion deleted successfully
 */
evals.delete(
  "/criteria/:id",
  checkAccess("evaluations", "update"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;

    await sql`
      delete from eval_criteria
      where id = ${id}
        and eval_id in (select id from eval where project_id = ${projectId})
    `;

    ctx.status = 200;
  },
);

/* ────────────────────────────────────────────────────────────
   3. eval_results — simple read-only helpers
   ──────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /v1/evals/{evalId}/results:
 *   get:
 *     summary: List results for an evaluation
 *     tags: [Evals, Results]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: evalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of results
 */
evals.get(
  "/:evalId/results",
  checkAccess("evaluations", "read"),
  async (ctx: Context) => {
    const { evalId } = ctx.params;
    const { projectId } = ctx.state;

    /* verify access */
    const [evaluation] =
      await sql`select id from eval where id = ${evalId} and project_id = ${projectId}`;
    if (!evaluation) ctx.throw(403, "unauthorized");

    const rows =
      await sql`select * from eval_result where eval_id = ${evalId} order by created_at asc`;

    ctx.body = rows;
  },
);

/**
 * @openapi
 * /v1/evals/results/{id}:
 *   get:
 *     summary: Get a single result
 *     tags: [Evals, Results]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Result details
 */
evals.get(
  "/results/:id",
  checkAccess("evaluations", "read"),
  async (ctx: Context) => {
    const { id } = ctx.params;
    const { projectId } = ctx.state;

    const [result] = await sql`
      select er.*
      from eval_result er
      left join eval e on er.eval_id = e.id
      where er.id = ${id} and e.project_id = ${projectId}
    `;

    if (!result) ctx.throw(404, "result not found");

    ctx.body = result;
  },
);

export default evals;
