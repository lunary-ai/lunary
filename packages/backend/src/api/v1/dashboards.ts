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
  const { projectId, userId } = ctx.state;

  // TODO: temporary, make a migration to create a home dashboard for all projects existing project
  // + add a new dashboard on new project creation
  const [homeDashboard] = await sql`
    select 
      * 
    from 
      dashboard
    where 
      project_id = ${projectId} 
      and is_home = true
  `;

  if (!homeDashboard) {
    await sql`
      insert into dashboard ${sql({
        projectId,
        ownerId: userId,
        name: "Default Dashboard",
        isHome: true,
        chartIds: DEFAULT_CHARTS,
      })}
      returning *
    `;
  }

  const dashboards = await sql`
    select 
      * 
    from 
      dashboard
    where 
      project_id = ${projectId} 
    order by 
      is_home desc, 
      name
  `;

  ctx.body = dashboards;
});

dashboards.get("/:id", async (ctx: Context) => {
  const { id: dashboardId } = z
    .object({ id: z.string().uuid() })
    .parse(ctx.params);

  const [dashboard] =
    await sql`select * from dashboard where id = ${dashboardId}`;

  ctx.body = dashboard;
});

dashboards.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state;
  const bodySchema = z.object({
    name: z.string(),
    description: z.string().optional().nullable().default(null),
    filters: z.any(),
    isHome: z.boolean().optional().nullable().default(false),
    chartIds: z.array(z.string()).nullable().optional().default(DEFAULT_CHARTS),
  });

  const { name, chartIds, description, filters, isHome } = bodySchema.parse(
    ctx.request.body,
  );

  const insertedDashboard = sql.begin(async (sql) => {
    if (isHome) {
      await sql`
        update 
          dashboard
        set 
          is_home = false
        where 
          project_id = ${projectId}
          and is_home = true
      `;
    }

    const [insertedDashboard] = await sql`
      insert into dashboard ${sql({
        projectId,
        ownerId: userId,
        name,
        description,
        filters,
        isHome,
        chartIds,
      })}
      returning *
    `;

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
    isHome: z.boolean().optional(),
    chartIds: z.array(z.string()).optional(),
  });
  const { name, chartIds, description, filters, isHome } = bodySchema.parse(
    ctx.request.body,
  );

  const dashboardToUpdate = clearUndefined({
    updatedAt: new Date(),
    name,
    description,
    filters,
    isHome,
    chartIds,
  });

  const updatedDashboard = sql.begin(async (sql) => {
    if (isHome) {
      await sql`
        update 
          dashboard
        set 
          is_home = false
        where 
          project_id = ${projectId}
          and is_home = true
          and id != ${dashboardId}
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

    return updatedDashboard;
  });

  ctx.body = updatedDashboard;
});

dashboards.delete("/:id", async (ctx: Context) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);

  const [dashboardToDelete] =
    await sql`select * from dashboard where id = ${id}`;

  if (dashboardToDelete.isHome) {
    ctx.throw(400, "Cannot delete home dashboard");
  }

  await sql`delete from dashboard where id = ${id}`;

  ctx.status = 200;
});

export default dashboards;
