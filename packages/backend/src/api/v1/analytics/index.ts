import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { DateTime } from "luxon";
import { deserializeLogic } from "shared";
import { z } from "zod";
import { buildFiltersQuery, parseQuery } from "./utils";

const analytics = new Router({
  prefix: "/analytics",
});

analytics.get("/tokens", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  if (granularity === "weekly") {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_sums as (
          select
            d.date,
            coalesce(sum(r.prompt_tokens + r.completion_tokens)::int, 0) as tokens,
            r.name
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by
            d.date,
            r.name
        )
        select
          date, 
          tokens as value, 
          name
        from
          weekly_sums
        order by
          date;
      `;
    ctx.body = { data: res };
    return;
  } else {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        )
        select
          d.date,
          coalesce(sum(r.prompt_tokens + r.completion_tokens)::int, 0) as value,
          r.name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date,
          r.name
        order by 
          d.date;
    `;

    ctx.body = { data: res };
    return;
  }
});

analytics.get("/costs", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  if (granularity === "weekly") {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_costs as (
          select
            d.date,
            coalesce(sum(r.cost)::float, 0) as costs,
            r.name
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by
            d.date,
            r.name
        )
        select
          date, 
          costs as value, 
          name
        from
          weekly_costs 
        order by
          date;
      `;
    ctx.body = { data: res };
    return;
  } else {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        )
        select
          d.date,
          coalesce(sum(r.cost)::float, 0) as value ,
          r.name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date,
          r.name
        order by d.date;
    `;

    ctx.body = { data: res };
    return;
  }
});

analytics.get("/errors", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  if (granularity === "weekly") {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_errors as (
          select
            d.date,
            coalesce(count(r.*)::int, 0) as errors
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
            and r.error is not null
          group by
            d.date
          having 
            coalesce(count(r.*)::int, 0) != 0
        )
        select
          date, 
          errors as value,
          'error' as name
        from
          weekly_errors
        order by
          date;
      `;
    ctx.body = { data: res };
    return;
  } else {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
          and r.error is not null
        )
        select
          d.date,
          coalesce(count(r.*)::int, 0) as value,
          'error' as name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date
        order by d.date;
    `;

    ctx.body = { data: res };
    return;
  }
});

analytics.get("/users/new", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const {
    datesQuery,
    granularity,
    timeZone,
    localCreatedAt,
    startDate,
    endDate,
    startUtc,
    endUtc,
    filteredRunsQuery,
  } = parseQuery(projectId, ctx.querystring, ctx.query);

  const distinctMap = {
    hourly: sql`distinct on (r.external_user_id, date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp)`,
    daily: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
    weekly: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
  };
  const distinct = distinctMap[granularity];

  const dimensionsSchema = z.object({
    firstDimension: z.string().optional().default("undefined"),
    secondDimension: z.string().optional().default("undefined"),
  });
  const {
    firstDimension: firstDimensionKey,
    secondDimension: secondDimensionKey,
  } = dimensionsSchema.parse(ctx.query);

  const [{ stat }] = await sql`
    select
      coalesce(count(distinct r.external_user_id)::int, 0) as stat
    from
      run r
      left join external_user eu on eu.id = r.external_user_id
    where
      r.project_id = ${projectId}
      and r.external_user_id is not null
      and  r.created_at >= ${startUtc}::timestamptz     
      and  r.created_at <  ${endUtc}::timestamptz     
      and eu.created_at at time zone ${timeZone} <= r.created_at
      and eu.created_at at time zone ${timeZone}>= r.created_at - interval '7 days'
  `;

  if (firstDimensionKey === "undefined" || secondDimensionKey === "undefined") {
    if (granularity === "weekly") {
      const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          select
            ${distinct}
            r.*,
            ${localCreatedAt}
          from
            run r
          where
            r.project_id = ${projectId}
            and r.external_user_id is not null
        ),
        weekly_new_users as (
          select
            d.date,
            coalesce(count(distinct r.external_user_id)::int, 0) as users
          from
            dates d
            left join filtered_runs r
              on r.local_created_at >= d.date
              and r.local_created_at < d.date + interval '7 days'
            left join external_user eu
              on eu.id = r.external_user_id
              and eu.created_at at time zone ${timeZone} >= d.date
              and eu.created_at < d.date + interval '7 days'
          where
            eu.id is not null
          group by
            d.date
          order by
            d.date
        )
        select
          date,
          users as value
        from
          weekly_new_users
        order by
          date;
      `;

      ctx.body = { data, stat: stat || 0 };
      return;
    } else {
      const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          select
            ${distinct}
            r.*,
            ${localCreatedAt}
          from
            run r
          left join external_user eu on eu.id = r.external_user_id
          where
            r.project_id = ${projectId}
            and r.external_user_id is not null
            and eu.created_at <= r.created_at
            and eu.created_at >= r.created_at - interval '7 days'
        )
        select
          d.date,
          coalesce(count(distinct r.external_user_id)::int, 0) as value,
          'Count' as name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by
          d.date
        order by d.date;
      `;

      ctx.body = { data, stat: stat || 0 };
      return;
    }
  }

  if (granularity === "weekly" && secondDimensionKey === "date") {
    const rows = await sql<{ date: Date; name: string; value: number }[]>`
      with dates as (
        ${datesQuery}
      ),
      filtered_runs as (
        select
          r.external_user_id,
          date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at,
          eu.props ->> ${firstDimensionKey as string} as first_dimension_value
        from
          run r
        left join external_user eu on eu.id = r.external_user_id
        where
          r.project_id = ${projectId}
          and r.external_user_id is not null
          and r.created_at >= ${startDate} at time zone ${timeZone}
          and r.created_at <= ${endDate} at time zone ${timeZone}
          and eu.created_at <= r.created_at
          and eu.created_at >= r.created_at - interval '7 days'
      ),
      weekly_new_users as (
        select
          d.date,
          coalesce(fr.first_dimension_value, 'Unknown') as name,
          coalesce(count(distinct fr.external_user_id)::int, 0) as value
        from
          dates d
          left join filtered_runs fr on fr.local_created_at >= d.date and fr.local_created_at < d.date + interval '7 days'
        group by
          d.date,
          first_dimension_value
        order by
          d.date
      )
      select
        date,
        name,
        value
      from
        weekly_new_users
      order by
        date;
    `;

    let dateObj: {
      [dateStr: string]: {
        date: Date;
        name: string;
        value: number;
      };
    } = {};

    for (const row of rows) {
      const dateStr = row.date.toLocaleDateString("en", {
        timeZone,
      });
      const name = row.name ?? "Unknown";
      const key = `${dateStr}:${name}`;

      if (!dateObj[key]) {
        dateObj[key] = { date: row.date, name, value: 0 };
      }
      dateObj[key].value += row.value;
    }

    const data = Object.values(dateObj).sort((a, b) => a.date - b.date);
    ctx.body = { data, stat: stat || 0 };
    return;
  } else {
    let rows;

    if (secondDimensionKey !== "date") {
      rows = await sql<
        { value: string; firstDimensionValue: string; userCount: number }[]
      >`
        with second_dimension as (
          select distinct
            props ->> ${secondDimensionKey as string} as value
          from
            public.external_user
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        users as (
          select distinct on (eu.id)
            eu.*
          from
            filtered_runs r
            left join external_user eu on eu.id = r.external_user_id
          where
            r.external_user_id = eu.id
            and  r.created_at >= ${startUtc}::timestamptz     
            and  r.created_at <  ${endUtc}::timestamptz     
            and eu.created_at <= r.created_at
            and eu.created_at >= r.created_at - interval '7 days'
        )
        select
          sd.value as value,
          coalesce(u.props ->> ${firstDimensionKey as string}, 'Unknown') as first_dimension_value,
          coalesce(count(u.id)::int, 0) as user_count
        from
          second_dimension sd
          left join users u on u.props ->> ${secondDimensionKey as string} = sd.value
        group by
          sd.value,
          first_dimension_value
        order by
          sd.value,
          first_dimension_value
      `;
    } else {
      rows = await sql<{ date: Date; name: string; value: number }[]>`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          select
            r.external_user_id,
            date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at,
            eu.props ->> ${firstDimensionKey as string} as first_dimension_value
          from
            run r
          left join external_user eu on eu.id = r.external_user_id
          where
            r.project_id = ${projectId}
            and r.external_user_id is not null
            and r.created_at >= ${startUtc}::timestamptz     
            and r.created_at <  ${endUtc}::timestamptz     
            and eu.created_at <= r.created_at
            and eu.created_at >= r.created_at - interval '7 days'
        )
        select
          d.date,
          coalesce(fr.first_dimension_value, 'Unknown') as name,
          coalesce(count(distinct fr.external_user_id)::int, 0) as value
        from
          dates d
          left join filtered_runs fr on d.date = fr.local_created_at
        group by
          d.date,
          first_dimension_value
        order by
          d.date;
      `;
      let dateObj: {
        [dateStr: string]: {
          date: Date;
          name: string;
          value: number;
        };
      } = {};

      for (const row of rows) {
        const dateStr = row.date.toLocaleDateString("en", {
          timeZone,
        });
        const name = row.name ?? "Unknown";
        const key = `${dateStr}:${name}`;

        if (!dateObj[key]) {
          dateObj[key] = { date: row.date, name, value: 0 };
        }
        dateObj[key].value += row.value;
      }

      const data = Object.values(dateObj).sort((a, b) => a.date - b.date);
      ctx.body = { data, stat: stat || 0 };
      return;
    }

    let dateObj: {
      [secondDimensionValue: string]: any;
    } = {};

    for (const row of rows) {
      let secondDimensionValue =
        row.value instanceof Date
          ? row.value.toISOString().split("T")[0]
          : row.value;

      const propValue = row.firstDimensionValue;
      const userCount = row.userCount;

      if (!dateObj[secondDimensionValue]) {
        dateObj[secondDimensionValue] = { value: secondDimensionValue };
      }
      if (!dateObj[secondDimensionValue][propValue]) {
        dateObj[secondDimensionValue][propValue] = 0;
      }
      dateObj[secondDimensionValue][propValue] += userCount;
    }

    const data = Object.values(dateObj).filter(({ value }) => value !== null);

    ctx.body = { data, stat: stat || 0 };
    return;
  }
});

analytics.get("/users/active", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const {
    datesQuery,
    granularity,
    timeZone,
    localCreatedAt,
    startDate,
    endDate,
    startUtc,
    endUtc,
    filteredRunsQuery,
  } = parseQuery(projectId, ctx.querystring, ctx.query);

  const distinctMap = {
    hourly: sql`distinct on (r.external_user_id, date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp)`,
    daily: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
    weekly: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
  };
  const distinct = distinctMap[granularity];

  const dimensionsSchema = z.object({
    firstDimension: z.string().optional().default("undefined"),
    secondDimension: z.string().optional().default("undefined"),
  });
  const {
    firstDimension: firstDimensionKey,
    secondDimension: secondDimensionKey,
  } = dimensionsSchema.parse(ctx.query);

  const [{ stat }] = await sql`
      select
        count(distinct r.external_user_id)::int as stat 
      from
        run r
      where
        r.project_id = ${projectId} 
        and r.external_user_id is not null
        and  r.created_at >= ${startUtc}::timestamptz     
        and  r.created_at <  ${endUtc}::timestamptz     
    `;

  if (firstDimensionKey === "undefined" || secondDimensionKey === "undefined") {
    const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          select 
            ${distinct}
            *,
            ${localCreatedAt}
          from
            run r
          where
            r.project_id = ${projectId}          
            and r.external_user_id is not null
        )
        select
          d.date,
          coalesce(count(r.external_user_id)::int, 0) as value,
          'Count' as name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date
        order by d.date;
    `;

    ctx.body = { data, stat: stat || 0 };
    return;
  }

  // TODO: stats + weekly + refacto queries

  if (granularity === "weekly") {
    const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          select 
            ${distinct}
            *,
            ${localCreatedAt}
          from
            run r
          where
            r.project_id = ${projectId}          
            and r.external_user_id is not null
        ),
        weekly_active_users as (
          select
           d.date,
          coalesce(count(r.external_user_id)::int, 0) as users
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by 
            d.date
          order by 
            d.date
        )
        select
          date, 
          users as value
        from
          weekly_active_users
        order by
          date;
      `;
    ctx.body = { data, stat: stat || 0 };
    return;
  } else {
    let rows;

    if (secondDimensionKey !== "date") {
      rows = await sql<
        { value: string; firstDimensionValue: "string"; userCount: Number }[]
      >`
        with second_dimension as (
          	select distinct
              props ->> ${secondDimensionKey as string} as value
            from
              public.external_user
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        users as (
          select distinct on (eu.id)
            eu.*
          from
            filtered_runs r
            left join external_user eu on eu.id = r.external_user_id 
          where
            r.external_user_id = eu.id
            and  r.created_at >= ${startUtc}::timestamptz     
            and  r.created_at <  ${endUtc}::timestamptz     
        )
        select
          sd.value as value, 
          coalesce(u.props ->> ${firstDimensionKey as string}, 'Unknown') as first_dimension_value, 
          coalesce(count(u.id)::int, 0) as user_count
        from
          second_dimension sd
          left join users u on u.props ->> ${secondDimensionKey as string} = sd.value
        group by
          sd.value,
          first_dimension_value
        order by
          sd.value,
          first_dimension_value
      `;
    } else {
      // secondDimensionKey === 'date'
      rows = await sql<{ date: Date; name: string; value: number }[]>`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          select
            r.external_user_id,
            date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at,
            eu.props ->> ${firstDimensionKey as string} as first_dimension_value
          from
            run r
          left join external_user eu on eu.id = r.external_user_id
          where
            r.project_id = ${projectId}
            and r.external_user_id is not null
            and  r.created_at >= ${startUtc}::timestamptz     
            and  r.created_at <  ${endUtc}::timestamptz     
        )
        select
          d.date,
          coalesce(fr.first_dimension_value, 'Unknown') as name,
          coalesce(count(distinct fr.external_user_id)::int, 0) as value 
        from
          dates d
          left join filtered_runs fr on d.date = fr.local_created_at
        group by
          d.date,
          first_dimension_value
        order by
          d.date;
      `;

      let dateObj: {
        [dateStr: string]: {
          date: Date;
          name: string;
          value: number;
        };
      } = {};

      for (const row of rows) {
        const dateStr = row.date.toLocaleDateString("en", {
          timeZone,
        });
        const name = row.name ?? "Unknown";
        const key = `${dateStr}:${name}`;

        if (!dateObj[key]) {
          dateObj[key] = { date: row.date, name, value: 0 };
        }
        dateObj[key].value += row.value;
      }

      const data = Object.values(dateObj).sort((a, b) => a.date - b.date);
      ctx.body = { data, stat: stat || 0 };
      return;
    }

    let dateObj: {
      [secondDimensionValue: string]: {};
    } = {};

    for (const row of rows) {
      let secondDimensionValue =
        row.value instanceof Date
          ? row.value.toISOString().split("T")[0]
          : row.value;

      const propValue = row.firstDimensionValue as string;

      const userCount = row.userCount as number;

      if (!dateObj[secondDimensionValue]) {
        dateObj[secondDimensionValue] = { value: secondDimensionValue };
      }
      if (!dateObj[secondDimensionValue][propValue]) {
        dateObj[secondDimensionValue][propValue] = 0;
      }
      dateObj[secondDimensionValue][propValue] += userCount;
    }

    const data = Object.values(dateObj).filter(({ value }) => value !== null);

    ctx.body = { data, stat: stat || 0 };
    return;
  }
});

analytics.get("/users/average-cost", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const {
    datesQuery,
    granularity,
    timeZone,
    localCreatedAt,
    startDate,
    endDate,
    startUtc,
    endUtc,
  } = parseQuery(projectId, ctx.querystring, ctx.query);

  const [{ stat }] = await sql`
      with total_costs as (
        select
          external_user_id,
          sum(cost) as total_cost
        from
          run
        where
          project_id = ${projectId} 
          and  created_at >= ${startUtc}::timestamptz     
          and  created_at <  ${endUtc}::timestamptz     
          and cost is not null
          and external_user_id is not null
        group by
          external_user_id
      )
      select
        avg(total_cost) as stat 
      from
        total_costs;
    `;

  if (granularity === "weekly") {
    const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        user_costs as (
          select 
            r.external_user_id,
            ${localCreatedAt}, 
            coalesce(sum(r.cost)::float, 0)  as total_cost
          from
            run r
          where
            r.project_id = ${projectId}          
            and r.external_user_id is not null
          group by 
            r.external_user_id,
            local_created_at
        ),
        weekly_user_cost as (
          select
            d.date,
            coalesce(avg(r.total_cost)::float, 0) as cost
          from
            dates d
          left join
            user_costs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by
          d.date
        having 
          coalesce(avg(r.total_cost)::float, 0) != 0
        order by
          d.date
        )
        select
          date, 
          cost as value,
          'Cost' as name          
        from
          weekly_user_cost
        order by
          date;
      `;
    ctx.body = { data, stat: stat || 0 };
    return;
  } else {
    const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        user_costs as (
          select 
            r.external_user_id,
            ${localCreatedAt}, 
            coalesce(sum(r.cost)::float, 0)  as total_cost
          from
            run r
          where
            r.project_id = ${projectId}          
            and r.external_user_id is not null
          group by 
            r.external_user_id,
            local_created_at
        )
        select
          d.date,
          coalesce(avg(r.total_cost)::float, 0) as value,
          'Cost' as name
        from
          dates d
          left join user_costs r on d.date = r.local_created_at
        group by
          d.date
        having 
          coalesce(avg(r.total_cost)::float, 0) != 0
        order by
          d.date;
      `;

    ctx.body = { data, stat };
    return;
  }
});

analytics.get("/run-types", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  if (granularity === "weekly") {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_sums as (
           select
            d.date,
            coalesce(count(r.type)::int, 0) as runs,
            r.type
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by 
            d.date,
            r.type
          order by d.date
        )
        select
          date, 
          runs as value, 
          type as name
        from
          weekly_sums
        order by
          date;
      `;
    ctx.body = { data: res };
    return;
  } else {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        )
        select
          d.date,
          coalesce(count(r.type)::int, 0) as value,
          r.type as name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date,
          r.type
        order by d.date;
    `;

    ctx.body = { data: res };
    return;
  }
});

analytics.get("/runs", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  if (granularity === "weekly") {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_sums as (
          select
            d.date,
            coalesce(count(r.type)::int, 0) as runs,
            'Events' as name 
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by 
            d.date
          order by d.date
        )
        select
          date, 
          runs as value, 
          name
        from
          weekly_sums
        order by
          date;
      `;
    ctx.body = { data: res };
    return;
  } else {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        )
        select
          d.date,
          coalesce(count(r.type)::int, 0) as value,
          'Events' as name 
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date
        order by d.date;
    `;
    const data = res.every((row: { value: number }) => row.value === 0)
      ? []
      : res;
    ctx.body = { data };
    return;
  }
});

analytics.get("/latency", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const {
    datesQuery,
    filteredRunsQuery,
    granularity,
    startDate,
    endDate,
    timeZone,
    startUtc,
    endUtc,
  } = parseQuery(projectId, ctx.querystring, ctx.query);

  const [{ stat }] = await sql`
      select
        avg(extract(epoch from r.duration))::float as stat
      from
        run r
      where
        r.project_id = ${projectId} 
        and type = 'llm'
        and  r.created_at >= ${startUtc}::timestamptz     
        and  r.created_at <  ${endUtc}  ::timestamptz  
    `;

  if (granularity === "weekly") {
    const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
      stats as (
        select
          d.date,
          percentile_cont(0.50) within group (order by extract(epoch from r.duration)::double precision) as p50,
          percentile_cont(0.75) within group (order by extract(epoch from r.duration)::double precision) as p75,
          percentile_cont(0.90) within group (order by extract(epoch from r.duration)::double precision) as p90,
          percentile_cont(0.95) within group (order by extract(epoch from r.duration)::double precision) as p95,
          percentile_cont(0.99) within group (order by extract(epoch from r.duration)::double precision) as p99
        from
          dates d
          left join filtered_runs r
            on r.local_created_at >= d.date
          and r.local_created_at <  d.date + interval '7 days'
        group by
          d.date
      )
      select
        date,
        coalesce(value, 0)  as value,
        name
      from
        stats
        cross join lateral (
          values
            (p50, 'p50'),
            (p75, 'p75'),
            (p90, 'p90'),
            (p95, 'p95'),
            (p99, 'p99')
        ) as v(value, name)
      order by
        date;
      `;
    ctx.body = { data, stat: stat || 0 };
    return;
  } else {
    const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        stats as (
          select
            d.date,
            percentile_cont(array[0.50, 0.75, 0.90, 0.95, 0.99])
              within group (order by extract(epoch from r.duration)::float) as pct_values
          from
            dates d
            left join filtered_runs r
              on d.date = r.local_created_at
          group by
            d.date
        )

        select
          s.date,
          coalesce(p.value, 0) as value,
          case p.percentile
              when 0.50 then 'p50'
              when 0.75 then 'p75'   -- was labelled p90 in your original
              when 0.90 then 'p90'
              when 0.95 then 'p95'
              when 0.99 then 'p99'
          end as name
        from
          stats s
          cross join lateral unnest(
            array[0.50, 0.75, 0.90, 0.95, 0.99],
            pct_values
          ) as p(percentile, value)
        order by
          s.date,
          p.percentile;
        
        ;
    `;

    ctx.body = { data, stat: stat || 0 };
    return;
  }
});

analytics.get("/threads", async (ctx: Context) => {
  const params = new URLSearchParams(ctx.querystring);
  params.set("type", "thread");
  ctx.querystring = params.toString();

  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  let data;
  if (granularity === "weekly") {
    data = await sql`
      with dates as (
        ${datesQuery}
      ),
      filtered_runs as (
        ${filteredRunsQuery}
      ),
      weekly_active as (
        select
          d.date,
          count(*) as active_conversations
        from
          dates d
        left join filtered_runs r 
          on r.local_created_at >= d.date 
          and r.local_created_at < d.date + interval '7 days'
          and r.type = 'thread'
        group by
          d.date
      )
      select
        d.date,
        coalesce(weekly_active.active_conversations, 0)::int as value,
        'Count' as name
      from
        dates d
        left join weekly_active on d.date = weekly_active.date
      order by
        d.date;
    `;
  } else {
    data = await sql`
      with dates as (
        ${datesQuery}
      ),
      filtered_runs as (
        ${filteredRunsQuery}
      ),
      active_conversations as (
        select
          date(created_at) as date,
          count(*) as active_conversations
        from
          filtered_runs r
        where
          type = 'thread'
          and created_at >= now() - interval '1 month'
        group by
          date(created_at)
      )
      select
        d.date,
        coalesce(a.active_conversations, 0)::int AS value,
        'Count' as name
      from
        dates d
        left join active_conversations a on d.date = a.date 
      order by
        d.date
    `;
  }

  ctx.body = { data };
});

analytics.get("/agents/top", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { startDate, endDate, timeZone, startUtc, endUtc } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  const data = await sql`
    with recursive chat_runs as (
      select
        id
      from
        run r
      where
        project_id = ${projectId} 
        and r.type = 'chat'
        and  r.created_at >= ${startUtc}::timestamptz     
        and  r.created_at <  ${endUtc}::timestamptz  
    ),
    agent_ids as (
      select
        r.id,
        r.cost,
        r.name,
        r.prompt_tokens,
        r.completion_tokens
      from
        run r
        inner join chat_runs on r.parent_run_id = chat_runs.id
      where
        project_id = ${projectId} 
        and r.type in ('chain', 'agent')
        and (parent_run_id is null or chat_runs.id is not null)
        and  r.created_at >= ${startUtc}::timestamptz     
        and  r.created_at <  ${endUtc}  ::timestamptz  
    ),
    agents_tree as (
      select 
        id, 
        name as agent_name,
        cost,
        prompt_tokens,
        completion_tokens
      from 
        agent_ids
      
      union all
      
      select 
        child.id,
        at.agent_name,
        child.cost,
        child.prompt_tokens,
        child.completion_tokens
      from
        run child
            inner join agents_tree at on child.parent_run_id = at.id
    )
    select 
      agent_name as name,
      coalesce(sum(cost), 0)::float as cost,
      coalesce(sum(prompt_tokens), 0)::bigint as prompt_tokens,
      coalesce(sum(completion_tokens), 0)::bigint as completion_tokens,
      coalesce(sum(prompt_tokens + completion_tokens), 0)::bigint as total_tokens
    from
      agents_tree 
    group by
      agent_name;
`;

  ctx.body = { data };
});

analytics.get("/feedback/thumb/up", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  if (granularity === "weekly") {
    const res = await sql`
      with dates as (
        ${datesQuery}
      ),
      filtered_runs as (
        ${filteredRunsQuery}
      ),
      feedback_data as (
        select
          r.local_created_at,
          case when r.feedback->>'thumb' = 'up' then 1 else 0 end as thumbs_up
        from
          filtered_runs r
        where 
          r.feedback->>'thumb' is not null 
      ),
      weekly_avg as (
        select
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end as local_created_at,
          coalesce(sum(fd.thumbs_up), 0) as total_thumbs_up
        from
          dates d
          left join feedback_data fd on fd.local_created_at >= d.date and fd.local_created_at < d.date + interval '7 days'
        group by 
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end
        order by d.date
      )
      select
        date, 
        coalesce(total_thumbs_up, 0) as value,
        'Thumbs Up' as name
      from
        weekly_avg
      order by
        date;
      `;
    ctx.body = { data: res };
    return;
  } else {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        feedback_data as (
          select
            r.local_created_at as date,
            case when r.feedback->>'thumb' = 'up' then 1 else 0 end as thumbs_up
          from
            filtered_runs r
          where 
            feedback is not null
        )
        select 
          date, 
          total_thumbs_up as value, 
          'Thumbs Up' as name from 
            (select d.date, coalesce(sum(fd.thumbs_up), 0)::int as total_thumbs_up
        from 
          dates d
          left join feedback_data fd on d.date = fd.date
        group by 
          d.date
        order by
          d.date ) r;
        `;
    ctx.body = { data: res };
    return;
  }
});

analytics.get("/feedback/thumb/down", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  if (granularity === "weekly") {
    const res = await sql`
      with dates as (
        ${datesQuery}
      ),
      filtered_runs as (
        ${filteredRunsQuery}
      ),
      feedback_data as (
        select
          r.local_created_at,
          case when r.feedback->>'down' = 'up' then 1 else 0 end as thumbs_down
        from
          filtered_runs r
        where 
          r.feedback->>'down' is not null 
      ),
      weekly_avg as (
        select
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end as local_created_at,
          coalesce(sum(fd.thumbs_down), 0) as total_thumbs_down
        from
          dates d
          left join feedback_data fd on fd.local_created_at >= d.date and fd.local_created_at < d.date + interval '7 days'
        group by 
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end
        order by d.date
      )
      select
        date, 
        coalesce(total_thumbs_down, 0) as value,
        'Thumbs Up' as name
      from
        weekly_avg
      order by
        date;
      `;
    ctx.body = { data: res };
    return;
  } else {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        feedback_data as (
          select
            r.local_created_at as date,
            case when r.feedback->>'thumb' = 'down' then 1 else 0 end as thumbs_down
          from
            filtered_runs r
          where 
            feedback is not null
        )
        select 
          date, 
          total_thumbs_down as value, 
          'Thumbs Down' as name from 
            (select d.date, coalesce(sum(fd.thumbs_down), 0)::int as total_thumbs_down
        from 
          dates d
          left join feedback_data fd on d.date = fd.date
        group by 
          d.date
        order by
          d.date ) r;
        `;
    ctx.body = { data: res };
    return;
  }
});

analytics.get("/feedback-ratio", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  if (granularity === "weekly") {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
      feedback_data as (
        select
          r.local_created_at,
          case when r.feedback->>'thumb' = 'up' then 1 else 0 end as thumbs_up,
          case when r.feedback->>'thumb' = 'down' then 1 else 0 end as thumbs_down
        from
          filtered_runs r
        where 
          r.feedback is not null
      ),
      weekly_avg as (
        select
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end as local_created_at,
          coalesce(sum(fd.thumbs_up), 0) as total_thumbs_up,
          coalesce(sum(fd.thumbs_down), 0) as total_thumbs_down,
          case 
            when coalesce(sum(fd.thumbs_up) + sum(fd.thumbs_down), 0) = 0 then 0 
            else ((sum(fd.thumbs_up)::float - sum(fd.thumbs_down)::float) / (sum(fd.thumbs_up)::float + sum(fd.thumbs_down)::float)) 
          end as ratio
        from
          dates d
          left join feedback_data fd on fd.local_created_at >= d.date and fd.local_created_at < d.date + interval '7 days'
        group by 
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end
        order by d.date
      )
      select
        date, 
        coalesce(ratio, 0) as value,
        'Ratio' as name
      from
        weekly_avg
      order by
        date;
      `;
    ctx.body = { data: res };
    return;
  } else {
    const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        feedback_data as (
          select
            r.local_created_at as date,
            case when r.feedback->>'thumb' = 'up' then 1 else 0 end as thumbs_up,
            case when r.feedback->>'thumb' = 'down' then 1 else 0 end as thumbs_down
          from
            filtered_runs r
          where 
            feedback is not null
        )
        select date, coalesce(ratio, 0) as value, 'Ratio' as name from (select 
          d.date,
          coalesce(sum(fd.thumbs_up), 0)::int as total_thumbs_up,
          coalesce(sum(fd.thumbs_down), 0)::int as total_thumbs_down,
          case 
            when coalesce(sum(fd.thumbs_up) + sum(fd.thumbs_down), 0) = 0 then null 
            else ((sum(fd.thumbs_up)::float - sum(fd.thumbs_down)::float) / (sum(fd.thumbs_up)::float + sum(fd.thumbs_down)::float)) end as ratio
        from 
          dates d
          left join feedback_data fd on d.date = fd.date
        group by 
          d.date
        order by
          d.date ) r;
        `;
    ctx.body = { data: res };
    return;
  }
});

analytics.get("/models/top", async (ctx: Context) => {
  const querySchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    timeZone: z.string().optional(),
    userId: z.string().optional(),
    name: z.string().optional(),
    checks: z.string().optional(),
  });
  const { projectId } = ctx.state;
  const { startDate, endDate, timeZone, userId, name } = querySchema.parse(
    ctx.request.query,
  );

  const startUtc = DateTime.fromISO(startDate, { zone: timeZone })
    .toUTC()
    .toISO();
  const endUtc = DateTime.fromISO(endDate, { zone: timeZone }).toUTC().toISO();

  const deserializedChecks = deserializeLogic(ctx.querystring);
  const filtersQuery = buildFiltersQuery(deserializedChecks);

  let dateFilter = sql``;
  if (startDate && endDate && timeZone) {
    dateFilter = sql`
        and  r.created_at >= ${startUtc}::timestamptz     
        and  r.created_at <  ${endUtc}::timestamptz  
      `;
  }

  let userFilter = sql``;
  if (userId) {
    userFilter = sql`and r.external_user_id = ${userId}`;
  }

  let nameFilter = sql``;
  if (name) {
    nameFilter = sql`and r.name = ${name}`;
  }

  const topModels = await sql`
      select
        name,
        coalesce(sum(prompt_tokens), 0)::bigint as prompt_tokens,
        coalesce(sum(completion_tokens), 0)::bigint as completion_tokens,
        coalesce(sum(prompt_tokens + completion_tokens), 0)::bigint as total_tokens,
        coalesce(sum(cost), 0)::float as cost
      from
        run r
      where
        ${filtersQuery}
        and r.project_id = ${projectId} 
        and r.type = 'llm'
        and r.name is not null
        ${dateFilter}
        ${userFilter}
        ${nameFilter}
      group by
        r.name
      order by
        total_tokens desc,
        cost desc
      limit 5
    `;

  ctx.body = topModels;
});

/**
 * @openapi
 * /v1/analytics/org/models/top:
 *   get:
 *     summary: List top LLM models across an organization
 *     description: |
 *       Returns the top models used across every project in the authenticated organization.
 *       This endpoint can only be accessed with an org-level private API key passed via the `x-api-key` header.
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         description: ISO8601 timestamp (inclusive) that bounds the analytics window. Requires `endDate` and `timeZone` when provided.
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         description: ISO8601 timestamp (exclusive) that bounds the analytics window. Requires `startDate` and `timeZone` when provided.
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: timeZone
 *         description: IANA time zone identifier used to localize the date range filters.
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         description: Filter to runs associated with a specific external user id.
 *         schema:
 *           type: string
 *       - in: query
 *         name: name
 *         description: Filter to a specific model name.
 *         schema:
 *           type: string
 *       - in: query
 *         name: checks
 *         description: Serialized logic string generated by Lunary dashboards to filter analytics.
 *         schema:
 *           type: string
 *     security:
 *       - OrgApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Top models across the organization.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Model name.
 *                   promptTokens:
 *                     type: integer
 *                   completionTokens:
 *                     type: integer
 *                   totalTokens:
 *                     type: integer
 *                   cost:
 *                     type: number
 *                   projectName:
 *                     type: string
 *                     nullable: true
 *                     description: Project contributing the most traffic for the model.
 *       401:
 *         description: Missing or invalid org API key supplied via the Authorization header.
 */
analytics.get("/org/models/top", async (ctx: Context) => {
  if (ctx.state.apiKeyType !== "org_private") {
    ctx.throw(401, "Org API key required");
    return;
  }

  const querySchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    timeZone: z.string().optional(),
    userId: z.string().optional(),
    name: z.string().optional(),
    checks: z.string().optional(),
  });

  const { orgId } = ctx.state;

  if (!orgId) {
    ctx.throw(400, "Missing org context");
    return;
  }

  const { startDate, endDate, timeZone, userId, name } = querySchema.parse(
    ctx.request.query,
  );

  const deserializedChecks = deserializeLogic(ctx.querystring);
  const filtersQuery = buildFiltersQuery(deserializedChecks);

  let dateFilter = sql``;
  if (startDate && endDate && timeZone) {
    const startUtc = DateTime.fromISO(startDate, { zone: timeZone })
      .toUTC()
      .toISO();
    const endUtc = DateTime.fromISO(endDate, { zone: timeZone })
      .toUTC()
      .toISO();

    dateFilter = sql`
        and  r.created_at >= ${startUtc}::timestamptz     
        and  r.created_at <  ${endUtc}::timestamptz  
      `;
  }

  let userFilter = sql``;
  if (userId) {
    userFilter = sql`and r.external_user_id = ${userId}`;
  }

  let nameFilter = sql``;
  if (name) {
    nameFilter = sql`and r.name = ${name}`;
  }

  console.log(startDate, endDate, timeZone);

  const topModels = await sql`
      with filtered_runs as (
        select
          r.project_id,
          r.name,
          coalesce(r.prompt_tokens, 0)::bigint as prompt_tokens,
          coalesce(r.completion_tokens, 0)::bigint as completion_tokens,
          coalesce(r.cost, 0)::float as cost,
          p.name as project_name
        from
          run r
          inner join project p on p.id = r.project_id
        where
          ${filtersQuery}
          and p.org_id = ${orgId}
          and r.type = 'llm'
          and r.name is not null
          ${dateFilter}
          ${userFilter}
          ${nameFilter}
      ),
      project_breakdown as (
        select
          project_id,
          project_name,
          name,
          sum(prompt_tokens) as prompt_tokens,
          sum(completion_tokens) as completion_tokens,
          sum(prompt_tokens + completion_tokens) as total_tokens,
          sum(cost) as cost
        from
          filtered_runs
        group by
          project_id,
          project_name,
          name
      ),
      ranked_projects as (
        select
          *,
          row_number() over (
            partition by name
            order by total_tokens desc, cost desc
          ) as project_rank
        from
          project_breakdown
      ),
      model_totals as (
        select
          name,
          sum(prompt_tokens) as prompt_tokens,
          sum(completion_tokens) as completion_tokens,
          sum(total_tokens) as total_tokens,
          sum(cost) as cost,
          max(project_name) filter (where project_rank = 1) as project_name
        from
          ranked_projects
        group by
          name
      )
      select
        name,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost,
        project_name
      from
        model_totals
      order by
        total_tokens desc,
        cost desc
      limit 5
    `;

  ctx.body = topModels;
});

analytics.get("/templates/top", async (ctx: Context) => {
  const querySchema = z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timeZone: z.string(),
    checks: z.string().optional(),
  });
  const { projectId } = ctx.state;
  const { startDate, endDate, timeZone, checks } = querySchema.parse(
    ctx.request.query,
  );

  const startUtc = DateTime.fromISO(startDate, { zone: timeZone })
    .toUTC()
    .toISO();
  const endUtc = DateTime.fromISO(endDate, { zone: timeZone }).toUTC().toISO();
  const deserializedChecks = deserializeLogic(ctx.querystring);
  const filtersQuery = buildFiltersQuery(deserializedChecks);

  const topTemplates = await sql`
      select
        t.slug, 
        t.id,
        count(*)::int as usage_count, 
        coalesce(sum(prompt_tokens), 0)::int as prompt_tokens,
        coalesce(sum(completion_tokens), 0)::int as completion_tokens,
        coalesce(sum(prompt_tokens + completion_tokens), 0)::int as total_tokens,
        coalesce(sum(cost), 0)::float as cost
      from
        run r
        left join template_version tv on r.template_version_id = tv.id
        left join template t on tv.template_id = t.id
      where
        ${filtersQuery}
        and r.project_id = ${projectId}
        and r.template_version_id is not null
        and  r.created_at >= ${startUtc}::timestamptz     
        and  r.created_at <  ${endUtc}::timestamptz  
      group by
        t.id 
      order by
        usage_count desc
      limit 5
    `;

  ctx.body = topTemplates;
});

analytics.get("/languages/top", async (ctx: Context) => {
  const { projectId } = ctx.state;
  ctx.query.granularity = "daily";
  const { datesQuery, filteredRunsQuery } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  const data = await sql`
      with dates as (
        ${datesQuery}
      ),
      filtered_runs as (
        ${filteredRunsQuery}
      )
      select 
        lang->>'isoCode' as iso_code,
        count(distinct r.id) as count
      from 
        dates d
        left join filtered_runs r on d.date = r.local_created_at
        join evaluation_result_v2 er on r.id = er.run_id
        join evaluator e on er.evaluator_id = e.id
        cross join lateral (
            select jsonb_array_elements(er.result->'input')
            union all
            select jsonb_array_elements(er.result->'output')
        ) as t(lang)
      where 
        e.type = 'language'
        and lang->>'isoCode' is not null
      group by 
        lang->>'isoCode'
      order by 
          count(distinct r.id) desc
      limit 5
      ;
      `;

  ctx.body = { data };
});

analytics.get("/topics/top", async (ctx: Context) => {
  const { projectId } = ctx.state;
  ctx.query.granularity = "daily";
  const { datesQuery, filteredRunsQuery } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  const data = await sql`
      with dates as (
        ${datesQuery}
      ),
      filtered_runs as (
        ${filteredRunsQuery}
      )
      select
        t.topic,
        count(*) as count
      from
        dates d
        left join filtered_runs r on d.date = r.local_created_at
        join evaluation_result_v2 er on r.id = er.run_id
        join evaluator e on er.evaluator_id = e.id
        cross join lateral (
          select distinct
            elem #>> '{}' as topic
          from
            jsonb_array_elements(jsonb_path_query_array(er.result, '$.input[*].topic') || jsonb_path_query_array(er.result, '$.output[*].topic')) as elem
        ) t
      where
        e.type = 'topics'
        and t.topic is not null
      group by
        t.topic
      order by
        count desc;
      ;`;

  ctx.body = { data };
});

analytics.get("/custom-events", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { startDate, endDate, timeZone, filteredRunsQuery, checks } =
    parseQuery(projectId, ctx.querystring, ctx.query);

  let eventFilter = sql`(r.type = 'custom-event')`;
  const eventNames = checks?.find((check) => check?.id === "custom-events")
    ?.params?.["custom-events"];
  if (eventNames) {
    eventFilter = sql`(r.type = 'custom-event' and r.name = any(${sql.array(eventNames)}))`;
  }

  const data = await sql`
     with dates as (
        select
          *
        from (
          select generate_series(
            ${startDate} at time zone ${timeZone},
            ${endDate} at time zone ${timeZone},
            '1 day'::interval
          )::timestamp as date) t
        where 
          date <=current_timestamp at time zone ${timeZone}
      ),
      filtered_runs as (
        ${filteredRunsQuery}
      )
        select
          d.date,
          coalesce(count(r.*)::int, 0) as value,
          r.name as name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        where 
          ${eventFilter} or r.type is null
        group by 
          d.date,
          r.name
        order by 
          d.date;
  `;

  ctx.body = { data };
});

export default analytics;
