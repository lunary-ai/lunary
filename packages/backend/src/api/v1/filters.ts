import sql from "@/src/utils/db";
import Router from "koa-router";
import { Context } from "koa";
import { z } from "zod";

const filters = new Router({
  prefix: "/filters",
});

filters.get("/models", async (ctx: Context) => {
  const { projectId } = ctx.state;

  // Using distinct is slow, so we use emulate Loose Index Scan as described here: https://wiki.postgresql.org/wiki/Loose_indexscan
  const rows = await sql`
    with recursive t as (
      select
        min(name) as name
      from
        run
      where
        project_id = ${projectId}
        and run.type = 'llm'
      
    union all

    select(
      select 
        min(name) as name
      from
        run
      where
        name > t.name
        and project_id = ${projectId}
        and run.type = 'llm'
      ) from t where t.name is not null
    )  
    select name from t where name is not null;
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

filters.get("/topics", async (ctx: Context) => {
  const { projectId } = ctx.state;

  const rows = await sql`
    select
      t.topic
    from
      evaluator e
      join evaluation_result_v2 er on er.evaluator_id = e.id
      cross join lateral (
        select distinct
          elem #>> '{}' as topic
        from
          jsonb_array_elements(jsonb_path_query_array(er.result, '$.input[*].topic') || jsonb_path_query_array(er.result, '$.output[*].topic')) as elem
      ) t
    where
      e.project_id = ${projectId}
      and e.type = 'topics'
      and t.topic is not null
    group by
      t.topic
  `;

  ctx.body = rows.map((row) => row.topic);
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
      ${
        search
          ? sql`and ( 
          external_id ilike ${"%" + search + "%"}
          or props->>'email' ilike ${"%" + search + "%"}
          or props->>'name' ilike ${"%" + search + "%"}
          or props->>'firstName' ilike ${"%" + search + "%"}
          or props->>'lastName' ilike ${"%" + search + "%"}
          or props->>'orgId' ilike ${"%" + search + "%"}
        )`
          : sql``
      }
    order by
      external_id 
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

filters.get("/topics", async (ctx) => {
  const { projectId } = ctx.state;

  const [{ topics }] = await sql`
    select
      coalesce(params->>'topics', null) as topics
    from
      evaluator
    where
      project_id =  ${projectId}
      and type = 'topics';
  `;

  ctx.body = topics;
});

export default filters;
