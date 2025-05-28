import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { CheckLogic } from "shared";
import { z } from "zod";

const checklists = new Router({
  prefix: "/checklists",
});

/**
 * @openapi
 * /v1/checklists:
 *   get:
 *     summary: List all checklists
 *     description: |
 *       Retrieve all checklists for the current project.
 *       Optionally filter by type. Returns checklists ordered by most recently updated.
 *     tags: [Checklists]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *         description: The type of checklists to retrieve (optional)
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Checklist'
 */
checklists.get("/", checkAccess("checklists", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;
  const querySchema = z.object({ type: z.string().optional() });
  const { type } = querySchema.parse(ctx.query);

  const rows = type
    ? await sql`
        select 
          * 
        from 
          checklist 
        where 
          project_id = ${projectId} 
          and type = ${type} 
        order by 
          updated_at desc`
    : await sql`
        select 
          * 
        from 
          checklist 
        where 
          project_id = ${projectId} 
        order by 
          updated_at desc`;

  ctx.body = rows;
});

/**
 * @openapi
 * /v1/checklists/{id}:
 *   get:
 *     summary: Get a specific checklist
 *     description: |
 *       Retrieve a specific checklist by its ID.
 *     tags: [Checklists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the checklist to retrieve
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Checklist'
 *       404:
 *         description: Checklist not found
 */
checklists.get(
  "/:id",
  checkAccess("checklists", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);

    const [check] = await sql`
      select 
        * 
      from 
        checklist 
      where 
        project_id = ${projectId} 
        and id = ${id}`;

    ctx.body = check;
  },
);

/**
 * @openapi
 * /v1/checklists:
 *   post:
 *     summary: Create a new checklist
 *     description: |
 *       Creates a new checklist with the provided slug, type, and data.
 *     tags: [Checklists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChecklistInput'
 *           example:
 *             slug: "pre-deployment-checklist"
 *             type: "deployment"
 *             data:
 *               items:
 *                 - name: "Run tests"
 *                   completed: false
 *                 - name: "Update documentation"
 *                   completed: false
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Checklist'
 *       400:
 *         description: Invalid input
 */
checklists.post(
  "/",
  checkAccess("checklists", "create"),
  async (ctx: Context) => {
    const { projectId, userId } = ctx.state;
    const bodySchema = z.object({
      slug: z.string(),
      type: z.string(),
      data: z.any() as z.ZodType<CheckLogic>,
    });
    const { slug, type, data } = bodySchema.parse(ctx.request.body);

    const [insertedCheck] = await sql`
    insert into checklist 
    ${sql({ slug, ownerId: userId, projectId, type, data })}
    returning *
  `;

    ctx.body = insertedCheck;
  },
);

/**
 * @openapi
 * /v1/checklists/{id}:
 *   patch:
 *     summary: Update a checklist
 *     description: |
 *       Update an existing checklist's slug and/or data.
 *     tags: [Checklists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the checklist to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChecklistUpdateInput'
 *           example:
 *             slug: "updated-checklist-slug"
 *             data:
 *               items:
 *                 - name: "Run tests"
 *                   completed: true
 *                 - name: "Update documentation"
 *                   completed: true
 *                 - name: "Deploy to production"
 *                   completed: false
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Checklist'
 *       404:
 *         description: Checklist not found
 *       400:
 *         description: Invalid input
 */
checklists.patch(
  "/:id",
  checkAccess("checklists", "update"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      slug: z.string().optional(),
      data: z.any() as z.ZodType<CheckLogic>,
    });
    const { slug, data } = bodySchema.parse(ctx.request.body);
    const { id } = paramsSchema.parse(ctx.params);

    const [updatedCheck] = await sql`
    update 
      checklist
    set 
        ${sql(clearUndefined({ slug, data, updatedAt: new Date() }))}
    where 
      project_id = ${projectId}
      and id = ${id}
    returning *
  `;
    ctx.body = updatedCheck;
  },
);

/**
 * @openapi
 * /v1/checklists/{id}:
 *   delete:
 *     summary: Delete a checklist
 *     description: |
 *       Delete a specific checklist by its ID.
 *     tags: [Checklists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the checklist to delete
 *     responses:
 *       200:
 *         description: Successful deletion
 *       404:
 *         description: Checklist not found
 */
checklists.delete(
  "/:id",
  checkAccess("checklists", "delete"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);

    await sql`
      delete from 
        checklist
      where 
        project_id = ${projectId}
        and id = ${id}
      returning *
    `;

    ctx.status = 200;
  },
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Checklist:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         slug:
 *           type: string
 *         type:
 *           type: string
 *         data:
 *           type: object
 *           description: The checklist data structure (CheckLogic type)
 *         projectId:
 *           type: string
 *           format: uuid
 *         ownerId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ChecklistInput:
 *       type: object
 *       required:
 *         - slug
 *         - type
 *         - data
 *       properties:
 *         slug:
 *           type: string
 *           description: Unique identifier for the checklist within the project
 *         type:
 *           type: string
 *           description: The type of checklist
 *         data:
 *           type: object
 *           description: The checklist data structure (CheckLogic type)
 *     ChecklistUpdateInput:
 *       type: object
 *       properties:
 *         slug:
 *           type: string
 *           description: Updated slug for the checklist
 *         data:
 *           type: object
 *           description: Updated checklist data structure (CheckLogic type)
 */
export default checklists;
