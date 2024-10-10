import sql from "@/src/utils/db";
import Router from "koa-router";
import { Context } from "koa";
import postgres from "postgres";
import { unCamelObject } from "@/src/utils/misc";
import { checkAccess } from "@/src/utils/authorization";
import { z } from "zod";
import { clearUndefined } from "@/src/utils/ingest";

const versions = new Router();

// Use unCameledSql to avoid camel casing the results so they're compatible with openai's SDK
// Otherwise it returns stuff like maxTokens instead of max_tokens and OpenAI breaks
const unCameledSql = postgres(process.env.DATABASE_URL!);

// Warning: This function is used to uncamelize the extras field of a template version
// It's used to make sure OpenAI messages are not camel cased as used in the app
// For example: toolCalls instead of tool_calls
export function unCamelExtras(version: any) {
  version.extra = unCamelObject(version.extra);
  return version;
}
/**
 * @openapi
 * /v1/template-versions/latest:
 *   get:
 *     summary: Get the latest version
 *     description: |
 *       This is the most common endpoint you'll use when working with prompt templates.
 *
 *       This route is used by the Lunary SDKs to fetch the latest version of a template before making an LLM call.
 *
 *       This route differs from all the next ones in that:
 *       - it requires only the `slug` parameter to reference a template
 *       - it doesn't require using a Private Key to authenticate the request (Public Key is enough)
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug of the template
 *     responses:
 *       200:
 *         description: Latest version of the template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateVersion'
 *       404:
 *         description: Template not found
 */
versions.get("/latest", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const { slug } = ctx.request.query as {
    slug: string; // Slug of template for which to fetch the latest version
  };

  const [latestVersion] = await unCameledSql`
    select 
      t.id::text, 
      t.slug, 
      tv.id::text, 
      tv.content, 
      tv.extra, 
      tv.created_at, 
      tv.version
    from 
      template t
      inner join template_version tv on t.id = tv.template_id
    where 
      t.project_id = ${projectId}
      and t.slug = ${slug}
      and tv.is_draft = false
    order by tv.created_at desc
    limit 1
  `;

  if (!latestVersion) {
    ctx.throw("Template not found, is the project ID correct?", 404);
  }

  // This makes sure OpenAI messages are not camel cased as used in the app
  // For example: message.toolCallId instead of message.tool_call_id
  if (typeof latestVersion.content !== "string") {
    latestVersion.content = latestVersion.content?.map((c: any) =>
      unCamelObject(c),
    );
  }

  ctx.body = unCamelExtras(latestVersion);
});

versions.get("/:id", async (ctx: Context) => {
  const { id: versionId } = ctx.params;
  const { projectId } = ctx.state;

  const [version] = await sql`
    select
      tv.*
    from
      template_version tv
      left join template t on tv.template_id = t.id
      left join project p on t.project_id = p.id and p.id = ${projectId}
    where
      tv.id = ${versionId}
  `;
  if (!version) {
    ctx.throw(401, "You do not have access to this ressource.");
  }

  const [template] = await sql`
    select * from template where project_id = ${projectId} and id = ${version.templateId}
  `;

  ctx.body = { ...unCamelExtras(version), template };
});

/**
 * @openapi
 * /v1/template-versions/{id}:
 *   patch:
 *     summary: Update a template version
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the template version
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateVersionUpdateInput'
 *     responses:
 *       200:
 *         description: Updated template version
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateVersion'
 *       401:
 *         description: Unauthorized access
 */
versions.patch(
  "/:id",
  checkAccess("prompts", "update"),
  async (ctx: Context) => {
    const bodySchema = z.object({
      content: z.union([z.array(z.any()), z.string()]),
      extra: z.any(),
      testValues: z.any(),
      isDraft: z.boolean(),
      notes: z.string().optional().nullable(),
    });

    const { content, extra, testValues, isDraft, notes } = bodySchema.parse(
      ctx.request.body,
    );

    const [templateVersion] = await sql`
      select
        *
      from
        template_version tv
        left join template t on tv.template_id = t.id
        left join project p on t.project_id = p.id 
      where
        tv.id = ${ctx.params.id}
        and p.org_id = ${ctx.state.orgId}
    `;

    if (!templateVersion) {
      ctx.throw(401, "You don't have access to this template");
    }

    const [updatedTemplateVersion] = await sql`
      update template_version
      set ${sql(
        clearUndefined({
          content: sql.json(content),
          extra: sql.json(unCamelObject(extra)),
          test_values: sql.json(testValues),
          is_draft: isDraft,
          notes,
          published_at: isDraft ? null : sql`now()`,
        }),
      )}
      where 
        id = ${ctx.params.id}
      returning *
    `;

    ctx.body = unCamelExtras(updatedTemplateVersion);
  },
);

export default versions;
