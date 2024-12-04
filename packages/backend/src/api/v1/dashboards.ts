import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";

import Router from "koa-router";
import { DEFAULT_CHARTS } from "shared";
import { z } from "zod";

const dashboards = new Router({
  prefix: "/dashboards",
});

// TODO: refactor zod schemas, (use .pick())

dashboards.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const dashboards = await sql`
    select 
      * 
    from 
      dashboard
    where 
      project_id = ${projectId} 
    order by 
      pinned desc, 
      name
  `;

  // TODO
  ctx.body = dashboards.map((dashboard) => ({
    ...dashboard,
    charts: DEFAULT_CHARTS,
  }));

  // ctx.body = dashboards;
});

dashboards.get("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id: dashboardId } = z
    .object({ id: z.string().uuid() })
    .parse(ctx.params);

  const [dashboard] =
    await sql`select * from dashboard where project_id = ${projectId} and id = ${dashboardId}`;

  dashboard.charts = DEFAULT_CHARTS; // TODO: fetch charts

  ctx.body = dashboard;
});

dashboards.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state;
  const bodySchema = z.object({
    name: z.string(),
    description: z.string().optional().nullable().default(null),
    filters: z.any(), // TODO: proper schema everywhere in the app
    pinned: z.boolean().optional().nullable().default(false),
    charts: z
      .array(z.any())
      .nullable()
      .optional()
      .default(DEFAULT_CHARTS.map()), // TODO
  });

  // TODO: rename chart to `insight`

  type Chart = z.infer<typeof chartSchema>;

  const { name, charts, description, filters, pinned } = bodySchema.parse(
    ctx.request.body,
  );

  const insertedDashboard = sql.begin(async (sql) => {
    if (pinned) {
      await sql`
        update 
          dashboard
        set 
          pinned = false
        where 
          project_id = ${projectId}
          and pinned = true
      `;
    }

    const [insertedDashboard] = await sql`
      insert into dashboard ${sql({
        projectId,
        ownerId: userId,
        name,
        description,
        filters,
        pinned,
      })}
      returning *
    `;

    for (const chart of charts) {
    }

    // TODO: insert charts
    // TODO: charts should be in their own table, not in the dashboard table

    return insertedDashboard;
  });

  ctx.body = insertedDashboard;
});

dashboards.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id: dashboardId } = z
    .object({ id: z.string().uuid() })
    .parse(ctx.params);
  const bodySchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    filters: z.any(),
    pinned: z.boolean().optional(),
    charts: z.array(z.string()).optional().default([]),
  });

  const { name, charts, description, filters, pinned } = bodySchema.parse(
    ctx.request.body,
  );

  const dashboardToUpdate = clearUndefined({
    updatedAt: new Date(),
    name,
    description,
    filters,
    pinned,
  });

  const updatedDashboard = sql.begin(async (sql) => {
    if (pinned) {
      await sql`
        update 
          dashboard
        set 
          pinned = false
        where 
          project_id = ${projectId}
          and pinned = true
      `;
    }

    const [updatedDashboard] = await sql`
      update 
        dashboard
      set 
        ${sql(dashboardToUpdate)} 
      where 
        id = ${dashboardId}
      returning *
    `;

    //TODO: update charts

    return updatedDashboard;
  });

  ctx.body = updatedDashboard;
});

dashboards.delete("/:id", async (ctx: Context) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);

  await sql`delete from dashboard where id = ${id}`;

  ctx.status = 200;
});

export default dashboards;
