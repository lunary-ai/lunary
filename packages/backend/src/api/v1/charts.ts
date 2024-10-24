import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";

import { z } from "zod";

const charts = new Router({
  prefix: "/charts",
});

const chartSchema = z.object({
  name: z.string(),
  type: z.string(),
  config: z.any(),
});

charts.get("/", checkAccess("charts", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;

  ctx.body = await sql`select * from chart
        where project_id = ${projectId} 
        order by updated_at desc`;
});

charts.get("/:id", checkAccess("charts", "read"), async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;

  const [chart] =
    await sql`select * from chart where project_id = ${projectId} and id = ${id}`;

  ctx.body = chart;
});

charts.post("/", checkAccess("charts", "create"), async (ctx: Context) => {
  const { projectId, userId } = ctx.state;

  const validatedData = chartSchema.parse(ctx.request.body);
  const { name, type, config } = validatedData;

  const [insertedCheck] = await sql`
    insert into chart ${sql({
      name,
      ownerId: userId,
      projectId,
      config,
      type,
    })}
    returning *
  `;
  ctx.body = insertedCheck;
});

charts.patch("/:id", checkAccess("charts", "update"), async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;

  const validatedData = chartSchema.partial().parse(ctx.request.body);
  const { name, config } = validatedData;

  const [updatedchart] = await sql`
    update chart
    set ${sql(clearUndefined({ name, updatedAt: new Date(), config }))}
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `;
  ctx.body = updatedchart;
});

charts.delete("/:id", checkAccess("charts", "delete"), async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;

  await sql`
    delete from chart
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `;

  ctx.status = 200;
});

export default charts;
