import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";

import { z } from "zod";

const views = new Router({
  prefix: "/views",
});

const ViewSchema = z.object({
  name: z.string(),
  data: z.any(),
  columns: z.any(),
  icon: z.string().optional(),
  type: z.enum(["llm", "thread", "trace"]),
});

/**
 * @openapi
 * /api/v1/views:
 *   get:
 *     summary: List all views
 *     tags: [Views]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/View'
 */
views.get("/", checkAccess("logs", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;

  ctx.body = await sql`select * from view
        where project_id = ${projectId} 
        order by updated_at desc`;
});

/**
 * @openapi
 * /api/v1/views/{id}:
 *   get:
 *     summary: Get a specific view
 *     tags: [Views]
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
 *               $ref: '#/components/schemas/View'
 *       404:
 *         description: View not found
 */
views.get("/:id", checkAccess("logs", "read"), async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;

  const [view] =
    await sql`select * from view where project_id = ${projectId} and id = ${id}`;

  ctx.body = view;
});

/**
 * @openapi
 * /api/v1/views:
 *   post:
 *     summary: Create a new view
 *     tags: [Views]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ViewInput'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/View'
 */
views.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state;

  const validatedData = ViewSchema.parse(ctx.request.body);
  const { name, data, columns, icon, type } = validatedData;

  const [insertedCheck] = await sql`
    insert into view ${sql({
      name,
      ownerId: userId,
      projectId,
      data,
      columns,
      icon,
      type,
    })}
    returning *
  `;
  ctx.body = insertedCheck;
});

/**
 * @openapi
 * /api/v1/views/{id}:
 *   patch:
 *     summary: Update a view
 *     tags: [Views]
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
 *             $ref: '#/components/schemas/ViewUpdateInput'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/View'
 */
views.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;

  const validatedData = ViewSchema.partial().parse(ctx.request.body);
  const { name, data, columns, icon } = validatedData;

  const [updatedView] = await sql`
    update view
    set ${sql(clearUndefined({ name, data, updatedAt: new Date(), columns, icon }))}
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `;
  ctx.body = updatedView;
});

/**
 * @openapi
 * /api/v1/views/{id}:
 *   delete:
 *     summary: Delete a view
 *     tags: [Views]
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
views.delete("/:id", checkAccess("logs", "delete"), async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;

  await sql`
    delete from view
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `;

  ctx.status = 200;
});

/**
 * @openapi
 * components:
 *   schemas:
 *     View:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         data:
 *           type: object
 *         columns:
 *           type: object
 *         icon:
 *           type: string
 *         type:
 *           type: string
 *           enum: [llm, thread, trace]
 *         projectId:
 *           type: string
 *         ownerId:
 *           type: string
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ViewInput:
 *       type: object
 *       required:
 *         - name
 *         - data
 *         - columns
 *         - type
 *       properties:
 *         name:
 *           type: string
 *         data:
 *           type: object
 *         columns:
 *           type: object
 *         icon:
 *           type: string
 *         type:
 *           type: string
 *           enum: [llm, thread, trace]
 *     ViewUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         data:
 *           type: object
 *         columns:
 *           type: object
 *         icon:
 *           type: string
 */

export default views;
