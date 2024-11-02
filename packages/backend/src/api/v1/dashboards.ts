import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";

import { z } from "zod";

const dashboards = new Router({
  prefix: "/dashboards",
});

const dashboardSchema = z.object({
  name: z.string(),
  charts: z.any(),
  filters: z.any(),
  pinned: z.boolean().optional().nullable(),
  description: z.string().optional().nullable(),
});

dashboards.get("/", checkAccess("dashboards", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state;

  ctx.body = await sql`select * from dashboard
        where project_id = ${projectId} 
        order by updated_at desc`;
});

dashboards.get(
  "/:id",
  checkAccess("dashboards", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id } = ctx.params;

    const [dashboard] =
      await sql`select * from dashboard where project_id = ${projectId} and id = ${id}`;

    ctx.body = dashboard;
  },
);

dashboards.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state;

  const validatedData = dashboardSchema.parse(ctx.request.body);
  const { name, charts, description, filters, pinned } = validatedData;

  const [insertedDashboard] = await sql`
    insert into dashboard ${sql({
      name,
      ownerId: userId,
      projectId,
      charts,
      description,
      filters,
      pinned,
    })}
    returning *
  `;
  ctx.body = insertedDashboard;
});

dashboards.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = ctx.params;

  const validatedData = dashboardSchema.partial().parse(ctx.request.body);
  const { name, charts, description, filters, pinned } = validatedData;

  const [dashboard] = await sql`
    update dashboard
    set ${sql(clearUndefined({ name, charts, description, filters, pinned, updatedAt: new Date() }))}
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `;
  ctx.body = dashboard;
});

dashboards.delete(
  "/:id",
  checkAccess("dashboards", "delete"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { id } = ctx.params;

    await sql`
    delete from dashboard
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `;

    ctx.status = 200;
  },
);

export default dashboards;
