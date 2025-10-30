import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { start } from "repl";
import { DEFAULT_CHARTS } from "shared";
import { z } from "zod";

const dashboards = new Router({
  prefix: "/dashboards",
});

dashboards.get("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state;

  const [homeDashboard] = await sql`
    select *
    from dashboard
    where project_id = ${projectId}
      and is_home = true
  `;

  if (!homeDashboard) {
    await sql.begin(async (sql) => {
      const [insertedDashboard] = await sql`
        insert into dashboard ${sql({
          project_id: projectId,
          owner_id: userId,
          name: "Default dashboard",
          description: null,
          checks: ["AND"],
          start_date: null,
          end_date: null,
          granularity: "daily",
          is_home: true,
        })}
        returning *
      `;

      const chartIds = Object.keys(DEFAULT_CHARTS);
      if (chartIds.length > 0) {
        const chartInserts = chartIds.map((chartId, index) => {
          const chartDef = DEFAULT_CHARTS[chartId];
          return {
            dashboard_id: insertedDashboard.id,
            name: chartDef.name,
            description: chartDef.description,
            type: chartDef.type,
            data_key: chartDef.dataKey,
            aggregation_method: chartDef.aggregationMethod,
            primary_dimension: null,
            secondary_dimension: null,
            is_custom: false,
            sortOrder: index,
            color: chartDef.color || null,
          };
        });

        await sql`
          insert into chart ${sql(chartInserts)}
        `;
      }
    });
  }

  const allDashboards = await sql`
    select * 
    from dashboard
    where project_id = ${projectId}
    order by is_home desc, name
  `;

  ctx.body = allDashboards;
});

dashboards.get("/:id", async (ctx: Context) => {
  const { id: dashboardId } = z
    .object({ id: z.string().uuid() })
    .parse(ctx.params);

  const [dashboard] = await sql`
    select *
    from dashboard
    where id = ${dashboardId}
  `;
  if (!dashboard) {
    ctx.throw(404, "dashboard not found");
  }

  const charts = await sql`
    select *
    from chart
    where dashboard_id = ${dashboardId}
    order by sort_order
  `;

  ctx.body = { ...dashboard, charts };
});

dashboards.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state;
  const bodySchema = z.object({
    name: z.string().optional(),
    description: z.string().optional().nullable().default(null),
    checks: z.any().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    granularity: z.string().optional(),
    isHome: z.boolean().optional().nullable().default(false),
    chartIds: z
      .array(z.string())
      .nullable()
      .optional()
      .default(Object.keys(DEFAULT_CHARTS)),
  });

  const {
    name,
    chartIds,
    description,
    checks,
    startDate,
    endDate,
    granularity,
    isHome,
  } = bodySchema.parse(ctx.request.body);

  const insertedDashboard = await sql.begin(async (sql) => {
    const [{ count }] =
      await sql`select count(*) from dashboard where project_id = ${projectId}`;
    if (isHome) {
      await sql`
        update dashboard
        set is_home = false
        where project_id = ${projectId}
          and is_home = true
      `;
    }

    const [insertedDashboard] = await sql`
      insert into dashboard ${sql(
        clearUndefined({
          project_id: projectId,
          owner_id: userId,
          name: name || `Dashboard ${count + 1}`,
          description,
          checks: checks === undefined ? undefined : checks,
          start_date: startDate === undefined ? undefined : startDate || null,
          end_date: endDate === undefined ? undefined : endDate || null,
          granularity:
            granularity === undefined ? undefined : granularity || null,
          is_home: isHome,
        }),
      )}
      returning *
    `;

    if (chartIds && chartIds.length > 0) {
      const chartInserts = chartIds.map((chartId, index) => {
        const chartDef = DEFAULT_CHARTS[chartId];
        return {
          dashboard_id: insertedDashboard.id,
          name: chartDef.name,
          description: chartDef.description,
          type: chartDef.type,
          data_key: chartDef.dataKey,
          aggregation_method: chartDef.aggregationMethod,
          primary_dimension: null,
          secondary_dimension: null,
          is_custom: false,
          sortOrder: index,
          color: chartDef.color || null,
          customChartId: null,
        };
      });

      await sql`
        insert into chart ${sql(chartInserts)}
      `;
    }

    return insertedDashboard;
  });

  const charts = await sql`
    select *
    from chart
    where dashboard_id = ${insertedDashboard.id}
    order by sort_order
  `;

  ctx.body = { ...insertedDashboard, charts };
});

dashboards.post("/charts/custom", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const bodySchema = z.object({
    name: z.string(),
    description: z.string().optional().nullable(),
    type: z.string(),
    dataKey: z.string(),
    aggregationMethod: z.string().nullable().optional(),
    primaryDimension: z.string().nullable().optional(),
    secondaryDimension: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    granularity: z.string().optional(),
    checks: z.any().optional(),
  });

  const {
    name,
    description,
    type,
    dataKey,
    aggregationMethod,
    primaryDimension,
    secondaryDimension,
    color,
    startDate,
    endDate,
    granularity,
    checks,
  } = bodySchema.parse(ctx.request.body);

  const [insertedCustomChart] = await sql`
    insert into custom_chart ${sql(
      clearUndefined({
        project_id: projectId,
        name,
        description,
        type,
        data_key: dataKey,
        aggregation_method:
          aggregationMethod === undefined
            ? undefined
            : aggregationMethod || null,
        primary_dimension:
          primaryDimension === undefined ? undefined : primaryDimension || null,
        secondary_dimension:
          secondaryDimension === undefined
            ? undefined
            : secondaryDimension || null,
        color: color === undefined ? undefined : color || null,
        startDate,
        endDate,
        granularity,
        checks,
      }),
    )}
    returning *
  `;

  ctx.body = insertedCustomChart;
});

dashboards.get("/charts/custom", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const customCharts = await sql`
    select
      *,
      true as is_custom
    from
      custom_chart
    where
      project_id = ${projectId}
    order by 
      created_at desc
  `;

  ctx.body = customCharts;
});

dashboards.post("/charts/custom/delete", async (ctx: Context) => {
  const { id: customChartId } = z
    .object({ id: z.string().uuid() })
    .parse(ctx.request.body);

  const [deletedChart] = await sql`
    delete from custom_chart
    where id = ${customChartId}
    returning *
  `;

  if (!deletedChart) {
    ctx.throw(404, "custom chart not found");
  }

  ctx.status = 200;
  ctx.body = deletedChart;
});

dashboards.patch("/charts/custom", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const bodySchema = z.object({
    id: z.string().uuid(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    dataKey: z.string().optional(),
    aggregationMethod: z.string().nullable().optional(),
    primaryDimension: z.string().nullable().optional(),
    secondaryDimension: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    granularity: z.string().optional(),
    checks: z.any().optional(),
  });

  const { id, ...updateFields } = bodySchema.parse(ctx.request.body);

  const [updatedChart] = await sql`
    update 
      custom_chart
    set 
      ${sql(
        clearUndefined({
          updated_at: new Date(),
          ...updateFields,
        }),
      )}
    where id = ${id}
      and project_id = ${projectId}
    returning *
  `;

  if (!updatedChart) {
    ctx.throw(404, "custom chart not found");
  }

  ctx.body = updatedChart;
});

dashboards.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id: dashboardId } = z
    .object({ id: z.string().uuid() })
    .parse(ctx.params);

  const bodySchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    checks: z.any().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    granularity: z.string().optional(),
    isHome: z.boolean().optional(),
    charts: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().nullable().optional(),
          type: z.string(),
          dataKey: z.string(),
          aggregationMethod: z.string().nullable().optional(),
          primaryDimension: z.string().nullable().optional(),
          secondaryDimension: z.string().nullable().optional(),
          isCustom: z.boolean().default(false),
          color: z.string().nullable().optional(),
          sortOrder: z.number().default(0),
          customChartId: z.string().nullable().optional(),
          startDate: z.string().optional().nullable(),
          endDate: z.string().optional().nullable(),
          granularity: z.string().optional().nullable(),
          checks: z.any().optional().nullable(),
        }),
      )
      .optional(),
  });

  const {
    name,
    charts,
    description,
    checks,
    startDate,
    endDate,
    granularity,
    isHome,
  } = bodySchema.parse(ctx.request.body);

  const dashboardToUpdate = clearUndefined({
    updated_at: new Date(),
    name,
    description,
    checks: checks === undefined ? undefined : checks,
    start_date: startDate === undefined ? undefined : startDate || null,
    end_date: endDate === undefined ? undefined : endDate || null,
    granularity: granularity === undefined ? undefined : granularity || null,
    is_home: isHome,
  });

  const updatedDashboard = await sql.begin(async (sql) => {
    if (isHome) {
      await sql`
        update dashboard
        set is_home = false
        where project_id = ${projectId}
          and is_home = true
          and id != ${dashboardId}
      `;
    }

    const [updatedDashboard] = await sql`
      update dashboard
      set ${sql(dashboardToUpdate)}
      where id = ${dashboardId}
      returning *
    `;

    if (charts && charts.length > 0) {
      await sql`
        delete from chart
        where dashboard_id = ${dashboardId}
      `;

      const chartInserts = charts.map((chart, index) => ({
        name: chart.name,
        description: chart.description || null,
        type: chart.type,
        data_key: chart.dataKey,
        aggregation_method: chart.aggregationMethod || null,
        primary_dimension: chart.primaryDimension || null,
        secondary_dimension: chart.secondaryDimension || null,
        is_custom: chart.isCustom || false,
        color: chart.color || null,
        sortOrder: index,
        dashboard_id: dashboardId,
        customChartId: chart.customChartId || null,
        startDate: chart.startDate,
        endDate: chart.endDate,
        granularity: chart.granularity,
        checks: chart.checks,
      }));

      await sql`
        insert into chart ${sql(chartInserts)}
      `;
    }

    return updatedDashboard;
  });

  const updatedCharts = await sql`
    select *
    from chart
    where dashboard_id = ${dashboardId}
    order by sort_order
  `;

  ctx.body = { ...updatedDashboard, charts: updatedCharts };
});

dashboards.delete("/:id", async (ctx: Context) => {
  const { id: dashboardId } = z
    .object({ id: z.string().uuid() })
    .parse(ctx.params);

  const [dashboardToDelete] = await sql`
    select *
    from dashboard
    where id = ${dashboardId}
  `;

  if (!dashboardToDelete) {
    ctx.throw(404, "dashboard not found");
  }

  if (dashboardToDelete.is_home) {
    ctx.throw(400, "cannot delete home dashboard");
  }

  await sql.begin(async (sql) => {
    await sql`
      delete from chart
      where dashboard_id = ${dashboardId}
    `;

    await sql`
      delete from dashboard
      where id = ${dashboardId}
    `;
  });

  ctx.status = 200;
});

export default dashboards;
