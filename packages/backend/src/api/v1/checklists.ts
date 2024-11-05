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

checklists.get("/", checkAccess("checklists", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;
  const querySchema = z.object({ type: z.string() });
  const { type } = querySchema.parse(ctx.query);

  const rows = await sql`
    select 
      * 
    from 
      checklist 
    where 
      project_id = ${projectId} 
      and type = ${type} 
    order by 
      updated_at desc`;

  ctx.body = rows;
});

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

export default checklists;
