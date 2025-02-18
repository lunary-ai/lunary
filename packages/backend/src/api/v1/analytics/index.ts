import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
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
          and error is not null
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
    filteredRunsQuery,
  } = parseQuery(projectId, ctx.querystring, ctx.query);

  const distinctMap = {
    hourly: sql`distinct on (r.external_user_id, date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp)`,
    daily: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
    weekly: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
  };
  const distinct = distinctMap[granularity];

  const firstDimensionKey = ctx.query.firstDimension || "undefined";
  const secondDimensionKey = ctx.query.secondDimension || "undefined";

  const [{ stat }] = await sql`
    select
      coalesce(count(distinct r.external_user_id)::int, 0) as stat
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
      let dateStr = row.date.toISOString().split("T")[0];
      const name = row.name;

      dateObj[dateStr] = dateObj[dateStr] || { date: row.date };
      if (!dateObj[dateStr].value) {
        dateObj[dateStr].value = 0;
      }
      dateObj[dateStr].value += row.value;
      dateObj[dateStr].name = name;
    }

    const data = Object.values(dateObj);

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
            and r.created_at >= ${startDate} at time zone ${timeZone}
            and r.ended_at <= ${endDate} at time zone ${timeZone}
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
            and r.created_at >= ${startDate} at time zone ${timeZone}
            and r.created_at <= ${endDate} at time zone ${timeZone}
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
        let dateStr = row.date.toISOString().split("T")[0];
        const name = row.name;

        dateObj[dateStr] = dateObj[dateStr] || { date: row.date };
        if (!dateObj[dateStr].value) {
          dateObj[dateStr].value = 0;
        }
        dateObj[dateStr].value += row.value;
        dateObj[dateStr].name = name;
      }

      const data = Object.values(dateObj);

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
    filteredRunsQuery,
  } = parseQuery(projectId, ctx.querystring, ctx.query);

  const distinctMap = {
    hourly: sql`distinct on (r.external_user_id, date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp)`,
    daily: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
    weekly: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
  };
  const distinct = distinctMap[granularity];

  const firstDimensionKey = ctx.query.firstDimension || "undefined";
  const secondDimensionKey = ctx.query.secondDimension || "undefined";

  const [{ stat }] = await sql`
      select
        count(distinct r.external_user_id)::int as stat 
      from
        run r
      where
        r.project_id = ${projectId} 
        and r.external_user_id is not null
        and created_at >= ${startDate} at time zone ${timeZone} 
        and created_at <= ${endDate} at time zone ${timeZone} 
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
            and r.created_at >= ${startDate} at time zone ${timeZone}
            and r.ended_at <= ${endDate} at time zone ${timeZone}
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
    and r.created_at >= ${startDate} at time zone ${timeZone}
    and r.created_at <= ${endDate} at time zone ${timeZone}
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
        let dateStr = row.date.toISOString().split("T")[0];
        const name = row.name;

        dateObj[dateStr] = dateObj[dateStr] || { date: row.date };
        if (!dateObj[dateStr].value) {
          dateObj[dateStr].value = 0;
        }
        dateObj[dateStr].value += row.value;
        dateObj[dateStr].name = name;
      }

      const data = Object.values(dateObj);

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
          and created_at >= ${startDate} at time zone ${timeZone} 
          and created_at <= ${endDate} at time zone ${timeZone} 
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

analytics.get("/latency", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const {
    datesQuery,
    filteredRunsQuery,
    granularity,
    startDate,
    endDate,
    timeZone,
  } = parseQuery(projectId, ctx.querystring, ctx.query);

  const [{ stat }] = await sql`
      select
        avg(extract(epoch from r.duration))::float as stat
      from
        run r
      where
        r.project_id = ${projectId} 
        and type = 'llm'
        and created_at >= ${startDate} at time zone ${timeZone} 
        and created_at <= ${endDate} at time zone ${timeZone} 
    `;

  if (granularity === "weekly") {
    const data = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_avg as (
          select
            d.date,
            coalesce(avg(extract(epoch from r.duration))::float, 0) as avg_duration
          from
            dates d
            left join filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by 
            d.date, r.local_created_at
          order by d.date
        )
        select
          date, 
          avg_duration as value,
          'Latency' as name
        from
          weekly_avg
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
        )
        select
          d.date,
          coalesce(avg(extract(epoch from r.duration))::float, 0) as value,
          'Latency' as name
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
});

analytics.get("/threads", async (ctx: Context) => {
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
          count(distinct r.parent_run_id) as active_conversations
        from
          dates d
        left join filtered_runs r 
          on r.local_created_at >= d.date 
          and r.local_created_at < d.date + interval '7 days'
          and r.type = 'chat'
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
          count(distinct parent_run_id) as active_conversations
        from
          filtered_runs r
        where
          type = 'chat'
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
  const { startDate, endDate, timeZone } = parseQuery(
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
        and date_trunc('day', r.created_at at time zone ${timeZone})::timestamp >= ${startDate}
        and date_trunc('day', r.created_at at time zone ${timeZone})::timestamp <= ${endDate}
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
        and date_trunc('day', r.created_at at time zone ${timeZone})::timestamp >= ${startDate}
        and date_trunc('day', r.created_at at time zone ${timeZone})::timestamp <= ${endDate} 
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

  const deserializedChecks = deserializeLogic(ctx.querystring);
  const filtersQuery = buildFiltersQuery(deserializedChecks);

  let dateFilter = sql``;
  if (startDate && endDate && timeZone) {
    dateFilter = sql`
        and date_trunc('day', r.created_at at time zone ${timeZone})::timestamp  >= ${startDate}
        and date_trunc('day', r.created_at at time zone ${timeZone})::timestamp  <= ${endDate}
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
  const deserializedChecks = deserializeLogic(ctx.querystring);
  const filtersQuery = buildFiltersQuery(deserializedChecks);

  const topTemplates = await sql`
      select
        t.slug, 
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
        and date_trunc('day', r.created_at at time zone ${timeZone})::timestamp  >= ${startDate}
        and date_trunc('day', r.created_at at time zone ${timeZone})::timestamp  <= ${endDate}
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
  const { startDate, endDate, timeZone, filteredRunsQuery } = parseQuery(
    projectId,
    ctx.querystring,
    ctx.query,
  );

  const checks = deserializeLogic(
    (ctx.query?.checks as string | undefined) || '["AND"]',
  );

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
