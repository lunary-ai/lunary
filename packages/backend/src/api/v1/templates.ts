import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import { unCamelObject } from "@/src/utils/misc";
import Router from "koa-router";
import { z } from "zod";

import { unCamelExtras } from "./template-versions";

const templates = new Router({
  prefix: "/templates",
});

/**
 * @openapi
 * /api/v1/templates:
 *   get:
 *     summary: List all templates
 *     description: |
 *       List all the prompt templates in your project, along with their versions.
 *       Useful for usecases where you might want to pre-load all the templates in your application.
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Template'
 */
templates.get("/", async (ctx: Context) => {
  const templates = await sql`
    select 
     t.*, 
     coalesce(json_agg(tv.*) filter (where tv.id is not null), '[]') as versions
    from 
      template t
      left join template_version tv on tv.template_id = t.id
    where 
      t.project_id = ${ctx.state.projectId}
    group by 
      t.id, 
      t.name, 
      t.slug, 
      t.mode, 
      t.created_at, 
      t.group, 
      t.project_id
    order by 
      t.created_at desc
  `;

  // uncamel each template's versions' extras' keys
  for (const template of templates) {
    template.versions = template.versions.map(unCamelExtras);
  }

  ctx.body = templates;
});

templates.get("/latest", async (ctx: Context) => {
  const templateVersions = await sql`
    select 
      distinct on (tv.template_id)
      tv.id::text, 
      t.slug, 
      tv.content,
      tv.extra,
      tv.created_at,
      tv.version
    from
      template_version tv
      left join template t on tv.template_id = t.id
    where
      tv.is_draft = false
      and project_id = ${ctx.state.projectId} 
    order by
      tv.template_id,
      tv.created_at desc; 
  `;

  ctx.body = templateVersions.map(unCamelExtras);
});

/**
 * @openapi
 * /api/v1/templates:
 *   post:
 *     summary: Create a new template
 *     description: |
 *       Creates a new template with the provided details.
 *       The template includes a slug, mode, content, and additional configuration options.
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateInput'
 *           example:
 *             slug: "greeting-template"
 *             mode: "openai"
 *             content: [
 *               {
 *                 "role": "system",
 *                 "content": "You are a friendly AI assistant."
 *               },
 *               {
 *                 "role": "user",
 *                 "content": "Hello, how are you?"
 *               }
 *             ]
 *             extra:
 *               temperature: 0.7
 *               max_tokens: 150
 *             isDraft: false
 *             notes: "Initial greeting template"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Template'
 *             example:
 *               id: "123e4567-e89b-12d3-a456-426614174000"
 *               slug: "greeting-template"
 *               mode: "openai"
 *               createdAt: "2023-06-01T12:00:00Z"
 *               versions:
 *                 - id: "789e0123-e45b-67d8-a901-234567890000"
 *                   content:
 *                     - role: "system"
 *                       content: "You are a friendly AI assistant."
 *                     - role: "user"
 *                       content: "Hello, how are you?"
 *                   extra:
 *                     temperature: 0.7
 *                     max_tokens: 150
 *                   isDraft: false
 *                   notes: "Initial greeting template"
 *                   createdAt: "2023-06-01T12:00:00Z"
 *                   version: 1
 */
templates.post("/", checkAccess("prompts", "create"), async (ctx: Context) => {
  const { projectId, userId } = ctx.state;

  const bodySchema = z.object({
    slug: z.string(),
    mode: z.enum(["text", "openai"]),
    content: z.array(z.any()),
    extra: z.any(),
    testValues: z.any().optional(),
    isDraft: z.boolean(),
    notes: z.string().optional(),
  });

  const { slug, mode, content, extra, testValues, isDraft, notes } =
    bodySchema.parse(ctx.request.body);

  const [template] = await sql`
    insert into template ${sql({
      projectId,
      ownerId: userId,
      slug,
      mode,
    })} returning *
  `;

  delete extra.stop;

  const [templateVersion] = await sql`
    insert into template_version ${sql(
      clearUndefined({
        templateId: template.id,
        content: sql.json(content),
        extra: sql.json(unCamelObject(clearUndefined(extra))),
        testValues: testValues ? sql.json(testValues) : undefined,
        isDraft: isDraft,
        notes,
      }),
    )} returning *
  `;

  ctx.body = {
    ...template,
    versions: [unCamelExtras(templateVersion)],
  };
});

/**
 * @openapi
 * /api/v1/templates/{id}:
 *   get:
 *     summary: Get a specific template
 *     description: |
 *       Get a specific prompt template and all its versions by its ID.
 *     tags: [Templates]
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
 *               $ref: '#/components/schemas/Template'
 *             example:
 *               id: "123e4567-e89b-12d3-a456-426614174000"
 *               name: "Customer Support Chat"
 *               slug: "customer-support-chat"
 *               mode: "openai"
 *               createdAt: "2023-01-01T00:00:00Z"
 *               projectId: "987e6543-e21b-12d3-a456-426614174000"
 *               versions:
 *                 - id: "abcd1234-e56f-78g9-h012-ijklmnopqrst"
 *                   templateId: "123e4567-e89b-12d3-a456-426614174000"
 *                   content:
 *                     - role: "system"
 *                       content: "You are a helpful customer support agent."
 *                     - role: "user"
 *                       content: "Hello, I have a question about my order."
 *                     - role: "assistant"
 *                       content: "Of course! I'd be happy to help you with your order. Could you please provide me with your order number?"
 *                   extra:
 *                     temperature: 0.7
 *                     maxTokens: 150
 *                   testValues:
 *                     orderNumber: "ORD-12345"
 *                   isDraft: false
 *                   notes: "Updated to improve response clarity"
 *                   createdAt: "2023-01-02T12:00:00Z"
 *                   version: 1
 *       404:
 *         description: Template not found
 */
templates.get("/:id", async (ctx: Context) => {
  const [template] = await sql`
    select * from template where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}
  `;

  if (!template) return ctx.throw(404, "Template not found");

  const versions = await sql`
    select * from template_version where template_id = ${template.id} order by version desc
  `;

  ctx.body = {
    ...template,
    versions: versions.map(unCamelExtras),
  };
});

/**
 * @openapi
 * /api/v1/templates/{id}:
 *   delete:
 *     summary: Delete a template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Successful deletion
 */
templates.delete(
  "/:id",
  checkAccess("prompts", "delete"),
  async (ctx: Context) => {
    await sql`delete from template where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}`;
    ctx.status = 204;
  },
);

/**
 * @openapi
 * /api/v1/templates/{id}:
 *   patch:
 *     summary: Update a template
 *     description: |
 *       This endpoint allows you to update the slug and mode of an existing template.
 *       The mode can be either "text" or "openai" (array of chat messages).
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the template to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateUpdateInput'
 *           example:
 *             slug: "updated-customer-support-chat"
 *             mode: "openai"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Template'
 *             example:
 *               id: "123e4567-e89b-12d3-a456-426614174000"
 *               slug: "updated-customer-support-chat"
 *               mode: "openai"
 *               projectId: "456e7890-e12b-34d5-a678-426614174111"
 *               createdAt: "2023-01-01T00:00:00Z"
 *               versions:
 *                 - id: "789e0123-e45b-67d8-a901-426614174222"
 *                   templateId: "123e4567-e89b-12d3-a456-426614174000"
 *                   content:
 *                     - role: "system"
 *                       content: "You are a helpful customer support agent."
 *                     - role: "user"
 *                       content: "I have a question about my order."
 *                   extra:
 *                     temperature: 0.7
 *                     max_tokens: 150
 *                   testValues:
 *                     orderNumber: "ORD-12345"
 *                   isDraft: false
 *                   notes: "Updated version for improved customer support"
 *                   createdAt: "2023-01-02T12:00:00Z"
 *                   version: 1
 *       404:
 *         description: Template not found
 *       400:
 *         description: Invalid input
 */
templates.patch(
  "/:id",
  checkAccess("prompts", "update"),
  async (ctx: Context) => {
    const bodySchema = z.object({
      slug: z.string().optional(),
      mode: z.enum(["text", "openai"]).optional(),
    });

    const { slug, mode } = bodySchema.parse(ctx.request.body);

    console.log(
      clearUndefined({
        slug,
        mode,
      }),
    );

    const [template] = await sql`
    update template set ${sql(
      clearUndefined({
        slug,
        mode,
      }),
    )}
    where project_id = ${ctx.state.projectId} and id = ${ctx.params.id} returning *`;

    if (!template) {
      ctx.throw(404, "Template not found");
    }

    const versions =
      await sql`select * from template_version where template_id = ${ctx.params.id} order by version desc`;

    ctx.body = {
      ...template,
      versions: versions.map(unCamelExtras),
    };
  },
);

/**
 * @openapi
 * /api/v1/templates/{id}/versions:
 *   post:
 *     summary: Create a new version for a template
 *     description: |
 *       This endpoint allows you to push a new version of a prompt.
 *       You can specify the content, extra parameters, test values, draft status, and notes for the new version.
 *     tags: [Templates, Versions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the template to create a new version for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateVersionInput'
 *           example:
 *             content: "Hello {{name}}, welcome to {{company}}!"
 *             extra:
 *               temperature: 0.7
 *               max_tokens: 150
 *             isDraft: false
 *             notes: "Updated welcome message with company name"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateVersion'
 *             example:
 *               id: "123"
 *               templateId: "456"
 *               content: "Hello {{name}}, welcome to {{company}}!"
 *               extra:
 *                 temperature: 0.7
 *                 max_tokens: 150
 *               isDraft: false
 *               notes: "Updated welcome message with company name"
 *               createdAt: "2023-06-01T12:00:00Z"
 *               version: 2
 */
templates.post(
  "/:id/versions",
  checkAccess("prompts", "update"),
  async (ctx: Context) => {
    const paramsSchema = z.object({
      id: z.coerce.number(),
    });
    const bodySchema = z.object({
      content: z.any(),
      extra: z.any(),
      testValues: z.any(),
      isDraft: z.boolean(),
      notes: z.string().optional().nullable(),
    });

    const { projectId } = ctx.state;
    const { content, extra, testValues, isDraft, notes } = bodySchema.parse(
      ctx.request.body,
    );
    const { id: templateId } = paramsSchema.parse(ctx.params);

    const [template] =
      await sql`select id from template where id = ${templateId} and project_id = ${projectId}
    `;

    if (!template) {
      ctx.throw(403, "Unauthorized");
    }

    const [templateVersion] = await sql`
      insert into template_version ${sql(
        clearUndefined({
          templateId: ctx.params.id,
          content: sql.json(content),
          extra: sql.json(unCamelObject(extra)),
          test_values: sql.json(testValues),
          isDraft,
          notes,
        }),
      )} 
      returning *
    `;

    ctx.body = unCamelExtras(templateVersion);
  },
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Template:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         mode:
 *           type: string
 *           enum: ["text", "openai"]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         group:
 *           type: string
 *         projectId:
 *           type: string
 *         versions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TemplateVersion'
 *     TemplateVersion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         templateId:
 *           type: string
 *         content:
 *           type: array
 *         extra:
 *           type: object
 *         testValues:
 *           type: object
 *         isDraft:
 *           type: boolean
 *         notes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         version:
 *           type: number
 *     TemplateInput:
 *       type: object
 *       required:
 *         - slug
 *         - mode
 *         - content
 *       properties:
 *         slug:
 *           type: string
 *         mode:
 *           type: string
 *           enum: ["text", "openai"]
 *         content:
 *           type: array
 *         extra:
 *           type: object
 *         testValues:
 *           type: object
 *         isDraft:
 *           type: boolean
 *         notes:
 *           type: string
 *     TemplateUpdateInput:
 *       type: object
 *       properties:
 *         slug:
 *           type: string
 *         mode:
 *           type: string
 *           enum: ["text", "openai"]
 *     TemplateVersionInput:
 *       type: object
 *       required:
 *         - content
 *         - isDraft
 *       properties:
 *         content:
 *           type: array
 *         extra:
 *           type: object
 *         testValues:
 *           type: object
 *         isDraft:
 *           type: boolean
 *         notes:
 *           type: string
 *     TemplateVersionUpdateInput:
 *       type: object
 *       properties:
 *         content:
 *           type: [array, string]
 *         extra:
 *           type: object
 *         testValues:
 *           type: object
 *         isDraft:
 *           type: boolean
 *         notes:
 *           type: string
 */

export default templates;
