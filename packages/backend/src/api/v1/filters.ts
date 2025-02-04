import sql from "@/src/utils/db";
import Router from "koa-router";
import { Context } from "koa";
import { z } from "zod";

const filters = new Router({
  prefix: "/filters",
});

filters.get("/models", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const rows = await sql`
    select distinct
      r.name
    from
      run r
    where
      r.project_id = ${projectId} 
      and r.type = 'llm'
      and r.name is not null
    order by
      name;
  `;

  ctx.body = rows.map((row) => row.name);
});

filters.get("/tags", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const rows = await sql`
    select distinct
      unnest(tags) as tag 
    from
      run
    where
      project_id = ${projectId} 
  `;

  ctx.body = rows.map((row) => row.tag);
});

filters.get("/metadata", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const rows = await sql`
    select distinct
      key
    from
      metadata_cache
    where
      project_id = ${projectId}
    order by
      key;
  `;

  ctx.body = rows.map((row) => row.key);
});

filters.get("/users", async (ctx) => {
  const { projectId } = ctx.state;
  const querySchema = z.object({
    limit: z.coerce.number().optional().default(3),
    page: z.coerce.number().optional().default(0),
    search: z.string().optional(),
  });
  const { limit, page, search } = querySchema.parse(ctx.request.query);

  const rows = await sql`
    select
      *
    from
      external_user
    where
      project_id = ${projectId}
      ${search ? sql`and id::text ilike ${"%" + search + "%"} ` : sql``}
    limit
      ${limit}
    offset 
      ${page * limit}
  `;

  ctx.body = rows;
});

filters.get("/templates", async (ctx) => {
  const { projectId } = ctx.state;

  const rows = await sql`
    select
      id as value,
      slug as label
    from
      template
    where
      project_id = ${projectId}
  `;

  ctx.body = rows;
});

filters.get("/custom-events", async (ctx) => {
  const { projectId } = ctx.state;

  const rows = await sql`
    select 
      distinct name as value,
      name as label
    from 
      run r 
    where 
      project_id = ${projectId}
      and r.type = 'custom-event'
  `;

  ctx.body = rows;
});

export default filters;
