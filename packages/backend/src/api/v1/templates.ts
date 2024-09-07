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

// insert template + a first version, and return the template with versions
templates.post("/", checkAccess("prompts", "create"), async (ctx: Context) => {
  const { projectId, userId } = ctx.state;

  const { slug, mode, content, extra, testValues, isDraft, notes } = ctx.request
    .body as {
    slug: string;
    mode: string;
    content: any[];
    extra: any;
    testValues: any;
    isDraft: boolean;
    notes: string;
  };

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

templates.get("/:id", async (ctx: Context) => {
  const [row] = await sql`
    select * from template where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}
  `;

  ctx.body = row;
});

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

export default templates;
