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
  data: z.array(z.any()),
  columns: z.any(),
  icon: z.string().optional(),
  type: z.enum(["llm", "thread", "trace"]),
});

/**
 * @openapi
 * /v1/views:
 *   get:
 *     summary: List all views
 *     description: Retrieves a list of all views for the current project, ordered by most recently updated.
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
 *             example:
 *               - id: "1234abcd"
 *                 name: "LLM Conversations"
 *                 data: ["AND", {"id": "models", "params": {"models": ["gpt-4"]}}]
 *                 columns: { id: "ID", content: "Content" }
 *                 icon: "chat"
 *                 type: "llm"
 *                 projectId: "project123"
 *                 ownerId: "user456"
 *                 updatedAt: "2023-04-01T12:00:00Z"
 */
views.get("/", checkAccess("logs", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;

  ctx.body = await sql`select * from view
        where project_id = ${projectId} 
        order by updated_at desc`;
});

/**
 * @openapi
 * /v1/views/{id}:
 *   get:
 *     summary: Get a specific view
 *     description: Retrieves details of a specific view by its ID.
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
 *             example:
 *               id: "1234abcd"
 *               name: "LLM Conversations"
 *               data: ["AND", {"id": "models", "params": {"models": ["gpt-4"]}}]
 *               columns: { id: "ID", content: "Content" }
 *               icon: "chat"
 *               type: "llm"
 *               projectId: "project123"
 *               ownerId: "user456"
 *               updatedAt: "2023-04-01T12:00:00Z"
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
 * /v1/views:
 *   post:
 *     summary: Create a new view
 *     description: Creates a new dashboard view with the provided details.
 *     tags: [Views]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ViewInput'
 *           example:
 *             name: "New LLM View"
 *             data: ["AND", {"id": "models", "params": {"models": ["gpt-4"]}}]
 *             icon: "chart"
 *             type: "llm"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/View'
 *             example:
 *               id: "5678efgh"
 *               name: "New LLM View"
 *               data: ["AND", {"id": "models", "params": {"models": ["gpt-4"]}}]
 *               columns: []
 *               icon: "chart"
 *               type: "llm"
 *               projectId: "project123"
 *               ownerId: "user456"
 *               updatedAt: "2023-04-01T14:30:00Z"
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
 * /v1/views/{id}:
 *   patch:
 *     summary: Update a view
 *     description: Updates an existing view with the provided details.
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
 *           example:
 *             name: "Updated LLM View"
 *             data: ["AND", {"id": "models", "params": {"models": ["gpt-4", "gpt-3.5-turbo"]}}]
 *             icon: "user"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/View'
 *             example:
 *               id: "1234abcd"
 *               name: "Updated LLM View"
 *               data: ["AND", {"id": "models", "params": {"models": ["gpt-4", "gpt-3.5-turbo"]}}]
 *               columns: []
 *               icon: "user"
 *               type: "llm"
 *               projectId: "project123"
 *               ownerId: "user456"
 *               updatedAt: "2023-04-02T10:15:00Z"
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
 * /v1/views/{id}:
 *   delete:
 *     summary: Delete a view
 *     description: Deletes a specific view by its ID.
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
 *         content:
 *           application/json:
 *             example:
 *               message: "View successfully deleted"
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
 *           example: "1234abcd"
 *         name:
 *           type: string
 *           example: "LLM Conversations"
 *         data:
 *           type: array
 *           items:
 *             oneOf:
 *               - type: string
 *               - type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   params:
 *                     type: object
 *           example: ["AND", {"id": "models", "params": {"models": ["gpt-4"]}}]
 *         columns:
 *           type: array
 *         icon:
 *           type: string
 *           example: "chat"
 *         type:
 *           type: string
 *           enum: [llm, thread, trace]
 *           example: "llm"
 *         projectId:
 *           type: string
 *           example: "project123"
 *         ownerId:
 *           type: string
 *           example: "user456"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-04-01T12:00:00Z"
 *     ViewInput:
 *       type: object
 *       required:
 *         - name
 *         - data
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           example: "New LLM View"
 *         data:
 *           type: array
 *           items:
 *             oneOf:
 *               - type: string
 *               - type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   params:
 *                     type: object
 *           example: ["AND", {"id": "models", "params": {"models": ["gpt-4"]}}]
 *         columns:
 *           type: object
 *           example: { id: "ID", content: "Content", date: "Date" }
 *         icon:
 *           type: string
 *           example: "chart"
 *         type:
 *           type: string
 *           enum: [llm, thread, trace]
 *           example: "llm"
 *     ViewUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Updated LLM View"
 *         data:
 *           type: array
 *           items:
 *             oneOf:
 *               - type: string
 *               - type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   params:
 *                     type: object
 *           example: ["AND", {"id": "models", "params": {"models": ["gpt-4", "gpt-3.5-turbo"]}}]
 *         columns:
 *           type: object
 *           example: { id: "ID", content: "Content", date: "Date", user: "User" }
 *         icon:
 *           type: string
 *           example: "user"
 */

export default views;
