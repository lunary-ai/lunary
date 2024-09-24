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
 *
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
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateInput'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Template'
 */
templates.post("/", checkAccess("prompts", "create"), async (ctx: Context) => {
  const { projectId, userId } = ctx.state;

  const bodySchema = z.object({
    slug: z.string(),
    mode: z.string(),
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
 *       404:
 *         description: Template not found
 */
templates.get("/:id", async (ctx: Context) => {
  const [row] = await sql`
    select * from template where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}
  `;

  if (!row) return ctx.throw(404, "Template not found");

  ctx.body = row;
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
    await sql`
    delete from template where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}
  `;

    ctx.status = 204;
  },
);

/**
 * @openapi
 * /api/v1/templates/{id}:
 *   patch:
 *     summary: Update a template
 *     tags: [Templates]
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
 *             $ref: '#/components/schemas/TemplateUpdateInput'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Template'
 */
templates.patch(
  "/:id",
  checkAccess("prompts", "update"),
  async (ctx: Context) => {
    const { slug, mode } = ctx.request.body as {
      slug: string;
      mode: string;
    };

    const [template] = await sql`
    update template set
      slug = ${slug},
      mode = ${mode}
    where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}
    returning *
  `;

    const versions = await sql`
    select * from template_version where template_id = ${ctx.params.id}
  `;

    for (const version of versions) {
      version.extra = unCamelObject(version.extra);
    }

    ctx.body = {
      ...template,
      versions,
    };
  },
);

/**
 * @openapi
 * /api/v1/templates/{id}/versions:
 *   post:
 *     summary: Create a new version for a template
 *     tags: [Templates, Versions]
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
 *             $ref: '#/components/schemas/TemplateVersionInput'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateVersion'
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
