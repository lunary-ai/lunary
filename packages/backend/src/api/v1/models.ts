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

/**
 * @openapi
 * /api/v1/models:
 *   get:
 *     summary: List models
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Model'
 */
models.get("/", checkAccess("logs", "list"), async (ctx: Context) => {
  const { orgId } = ctx.state;

  ctx.body = await sql`select * from model_mapping
        where org_id = ${orgId} or org_id is null
        order by updated_at desc`;
});

/**
 * @openapi
 * /api/v1/models:
 *   post:
 *     summary: Create a new model
 *     tags: [Models]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModelInput'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Model'
 */
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

/**
 * @openapi
 * /api/v1/models/{id}:
 *   patch:
 *     summary: Update a model
 *     tags: [Models]
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
 *             $ref: '#/components/schemas/ModelInput'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Model'
 */
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

/**
 * @openapi
 * /api/v1/models/{id}:
 *   delete:
 *     summary: Delete a model
 *     tags: [Models]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful deletion
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     Model:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         pattern:
 *           type: string
 *         unit:
 *           type: string
 *           enum: [TOKENS, CHARACTERS, MILLISECONDS]
 *         inputCost:
 *           type: number
 *         outputCost:
 *           type: number
 *         tokenizer:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ModelInput:
 *       type: object
 *       required:
 *         - name
 *         - pattern
 *         - unit
 *         - inputCost
 *         - outputCost
 *       properties:
 *         name:
 *           type: string
 *         pattern:
 *           type: string
 *         unit:
 *           type: string
 *           enum: [TOKENS, CHARACTERS, MILLISECONDS]
 *         inputCost:
 *           type: number
 *         outputCost:
 *           type: number
 *         tokenizer:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date-time
 */

export default models;
