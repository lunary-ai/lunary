import sql from "@/src/utils/db";
import { Context } from "koa";
import Router from "koa-router";
import { z } from "zod";
import { checkOrgBetaAccess } from "@/src/utils/org";

import {
  naturalLanguageToFilters,
  OpenAINotConfiguredError,
  type RunType,
} from "./natural-language-filter";

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
      t.tag 
    from
      run r
      cross join lateral unnest(r.tags) as t(tag)
    where
      project_id = ${projectId} 
      and r.tags is not null 
      and cardinality(r.tags) > 0;
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

filters.get("/intents", async (ctx: Context) => {
  const { projectId, orgId } = ctx.state;

  const orgHasBetaAccess = await checkOrgBetaAccess(orgId);
  if (!orgHasBetaAccess) {
    ctx.throw(404, "Not found");
  }

  const canonicalRows = await sql<
    {
      label: string;
      sortOrder: number;
      maxIntents: number;
    }[]
  >`
    with latest_version as (
      select
        v.evaluator_id,
        max(v.created_at) as created_at
      from
        intent_cluster_version v
        join evaluator e on e.id = v.evaluator_id
      where
        e.project_id = ${projectId}
        and e.type = 'intent'
      group by
        v.evaluator_id
    )
    select
      c.label as label,
      c.sort_order as "sortOrder",
      v.max_intents as "maxIntents"
    from
      intent_cluster_version v
      join latest_version lv on lv.evaluator_id = v.evaluator_id
      and lv.created_at = v.created_at
      join intent_cluster c on c.version_id = v.id
    where
      c.sort_order <= v.max_intents
      or lower(c.label) = 'other'
    order by
      c.sort_order asc,
      c.label asc
  `;

  if (canonicalRows.length) {
    const unique = Array.from(new Set(canonicalRows.map((row) => row.label)));
    ctx.body = unique;
    return;
  }

  const fallbackRows = await sql`
    select distinct
      intent->>'label' as label
    from
      evaluator e
      join evaluation_result_v2 er on er.evaluator_id = e.id
      cross join lateral jsonb_array_elements(coalesce(er.result->'input', '[]'::jsonb)) as payload
      cross join lateral jsonb_array_elements(coalesce(payload->'intents', '[]'::jsonb)) as intent
    where
      e.project_id = ${projectId}
      and e.type = 'intent'
      and intent->>'label' is not null
    order by
      label;
  `;

  ctx.body = fallbackRows.map((row) => row.label);
});

filters.get("/metadata", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const querySchema = z.object({
    type: z.string().optional(),
  });
  const { type } = querySchema.parse(ctx.query);

  const rows = await sql`
    select distinct
      key
    from
      metadata_cache
    where
      project_id = ${projectId}
      ${type ? sql`and type = ${type}` : sql``}
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

filters.get("/user-props/keys", async (ctx) => {
  const { projectId } = ctx.state;
  const querySchema = z.object({
    search: z.string().optional(),
    limit: z.coerce.number().optional().default(100),
  });
  const { search, limit } = querySchema.parse(ctx.request.query);

  const rows = await sql`
    with distinct_keys as (
      select distinct jsonb_object_keys(props) as key
      from external_user
      where project_id = ${projectId}
    )
    select key
    from distinct_keys
    where ${search ? sql`key ilike ${"%" + search + "%"}` : sql`true`}
    order by key
    limit ${limit}
  `;

  ctx.body = rows.map((row) => ({
    label: row.key,
    value: row.key,
  }));
});

filters.get("/user-props/values", async (ctx) => {
  const { projectId } = ctx.state;
  const querySchema = z.object({
    key: z.string(),
    limit: z.coerce.number().optional().default(100),
  });

  const { key, limit } = querySchema.parse(ctx.request.query);

  const rows = await sql`
    select
      distinct props->>${key} as raw_value 
    from
      external_user
    where
      project_id = ${projectId}
      and props ? ${key}
    order by
      raw_value asc nulls last
    limit ${limit}
  `;

  const formatLabel = (value: any): string => {
    if (value === null || typeof value === "undefined") {
      return "null";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return value.toString();
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  };

  ctx.body = rows.map((row) => {
    const label = formatLabel(row.rawValue);
    let value: string;

    if (row.rawValue !== null && row.rawValue !== undefined) {
      value = row.rawValue;
    } else if (row.rawValue === null || typeof row.rawValue === "undefined") {
      value = "null";
    } else {
      try {
        value = JSON.stringify(row.raw_value);
      } catch (error) {
        value = String(row.raw_value);
      }
    }

    return {
      label,
      value,
    };
  });
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

const naturalLanguageFiltersBodySchema = z.object({
  text: z.string().min(1),
  type: z.enum(["llm", "trace", "thread", "tool", "retriever"]).optional(),
});

filters.post("/natural-language", async (ctx: Context) => {
  const parsed = naturalLanguageFiltersBodySchema.safeParse(ctx.request.body);

  if (!parsed.success) {
    ctx.status = 400;
    ctx.body = { error: parsed.error.flatten() };
    return;
  }

  try {
    const { text, type } = parsed.data;
    const { projectId } = ctx.state;
    const runType: RunType = type ?? "llm";
    const result = await naturalLanguageToFilters(
      text,
      runType,
      projectId ?? "",
    );
    const { logic, query, details } = result;

    ctx.body = {
      logic,
      query,
      previewUrl: `/v1/runs?${query}`,
      debug: {
        normalizedPlan: details.normalizedPlan,
        unmatched: details.unmatched,
        availableModels: details.availableModels,
        availableTags: details.availableTags,
        availableTemplates: details.availableTemplates,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to translate natural language filters";
    const isConfigError = error instanceof OpenAINotConfiguredError;

    ctx.status = isConfigError ? 503 : 500;
    ctx.body = {
      error: "AI filter failed",
      message: isConfigError
        ? "AI filter require an OpenAI API key. If you're self-hosting Lunary, set the OPENAI_API_KEY environment variable and restart the backend service."
        : message,
    };
  }
});

export default filters;
