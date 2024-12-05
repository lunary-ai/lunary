import { checkAccess } from "@/src/utils/authorization";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";
import { buildFiltersQuery, parseQuery } from "./utils";

const analytics = new Router({
  prefix: "/analytics",
});

analytics.get(
  "/tokens",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
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
        order by d.date;
    `;

      ctx.body = { data: res };
      return;
    }
  },
);

analytics.get("/costs", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
    projectId,
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
          costs, 
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
          coalesce(sum(r.cost)::float, 0) as costs,
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

analytics.get(
  "/errors",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
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
          errors
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
          coalesce(count(r.*)::int, 0) as errors
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
  },
);

analytics.get(
  "/users/new",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const {
      datesQuery,
      granularity,
      timeZone,
      localCreatedAt,
      startDate,
      endDate,
      filteredRunsQuery,
    } = parseQuery(projectId, ctx.query);

    const firstDimensionKey = ctx.query.firstDimensionKey;
    const secondDimensionKey = ctx.query.secondDimensionKey;

    // Compute the total number of new users (stat)
    const [{ stat }] = await sql`
      select
        count(distinct eu.id)::int as stat
      from
        external_user eu
        join (
          ${filteredRunsQuery}
          and error is not null
        ) fr on eu.id = fr.external_user_id
      where
        eu.project_id = ${projectId}
        and eu.created_at >= ${startDate} at time zone ${timeZone}
        and eu.created_at <= ${endDate} at time zone ${timeZone}
    `;

    if (
      firstDimensionKey === "undefined" ||
      secondDimensionKey === "undefined"
    ) {
      if (granularity === "weekly") {
        const data = await sql`
          with dates as (
            ${datesQuery}
          ),
          filtered_runs as (
            ${filteredRunsQuery}
            and error is not null
          ),
          new_users as (
            select distinct on (eu.id)
              eu.*,
              date_trunc('day', fr.created_at at time zone ${timeZone})::timestamp as local_created_at
            from
              external_user eu
              join filtered_runs fr on eu.id = fr.external_user_id
            where
              eu.project_id = ${projectId}
              and eu.created_at >= ${startDate} at time zone ${timeZone}
              and eu.created_at <= ${endDate} at time zone ${timeZone}
          )
          select
            d.date,
            coalesce(count(nu.id)::int, 0) as users
          from
            dates d
            left join new_users nu on nu.local_created_at >= d.date and nu.local_created_at < d.date + interval '7 days'
          group by
            d.date
          order by
            d.date;
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
            and error is not null
          ),
          new_users as (
            select distinct on (eu.id)
              eu.*,
              date_trunc('day', fr.created_at at time zone ${timeZone})::timestamp as local_created_at
            from
              external_user eu
              join filtered_runs fr on eu.id = fr.external_user_id
            where
              eu.project_id = ${projectId}
              and eu.created_at >= ${startDate} at time zone ${timeZone}
              and eu.created_at <= ${endDate} at time zone ${timeZone}
          )
          select
            d.date,
            coalesce(count(nu.id)::int, 0) as users
          from
            dates d
            left join new_users nu on d.date = nu.local_created_at
          group by
            d.date
          order by
            d.date;
        `;
        ctx.body = { data, stat: stat || 0 };
        return;
      }
    } else {
      // Handle breakdown by dimensions
      let rows;

      if (secondDimensionKey !== "date") {
        rows = await sql<
          { value: string; firstDimensionValue: string; userCount: number }[]
        >`
          with second_dimension as (
            select distinct
              eu.props ->> ${secondDimensionKey as string} as value
            from
              public.external_user eu
            where
              eu.project_id = ${projectId}
          ),
          filtered_runs as (
            ${filteredRunsQuery}
            and error is not null
          ),
          new_users as (
            select distinct on (eu.id)
              eu.*,
              date_trunc('day', fr.created_at at time zone ${timeZone})::timestamp as local_created_at
            from
              external_user eu
              join filtered_runs fr on eu.id = fr.external_user_id
            where
              eu.project_id = ${projectId}
              and eu.created_at >= ${startDate} at time zone ${timeZone}
              and eu.created_at <= ${endDate} at time zone ${timeZone}
          )
          select
            sd.value as value,
            coalesce(nu.props ->> ${firstDimensionKey as string}, 'Unknown') as first_dimension_value,
            coalesce(count(nu.id)::int, 0) as user_count
          from
            second_dimension sd
            left join new_users nu on nu.props ->> ${secondDimensionKey as string} = sd.value
          group by
            sd.value,
            first_dimension_value
          order by
            sd.value,
            first_dimension_value;
        `;
      } else {
        rows = await sql<
          { value: Date; firstDimensionValue: string; userCount: number }[]
        >`
          with dates as (
            ${datesQuery}
          ),
          filtered_runs as (
            ${filteredRunsQuery}
            and error is not null
          ),
          new_users as (
            select distinct on (eu.id)
              eu.*,
              date_trunc('day', fr.created_at at time zone ${timeZone})::timestamp as local_created_at
            from
              external_user eu
              join filtered_runs fr on eu.id = fr.external_user_id
            where
              eu.project_id = ${projectId}
              and eu.created_at >= ${startDate} at time zone ${timeZone}
              and eu.created_at <= ${endDate} at time zone ${timeZone}
          )
          select
            d.date as value,
            coalesce(nu.props ->> ${firstDimensionKey as string}, 'Unknown') as first_dimension_value,
            coalesce(count(nu.id)::int, 0) as user_count
          from
            dates d
            left join new_users nu on d.date = nu.local_created_at
          group by
            d.date,
            first_dimension_value
          order by
            d.date,
            first_dimension_value;
        `;
      }

      // Process the query results into the desired format
      let dateObj: {
        [secondDimensionValue: string]: {
          value: string;
          [key: string]: number;
        };
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
  },
);

analytics.get(
  "/users/active",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const {
      datesQuery,
      granularity,
      timeZone,
      localCreatedAt,
      startDate,
      endDate,
      filteredRunsQuery,
    } = parseQuery(projectId, ctx.query);

    const distinctMap = {
      hourly: sql`distinct on (r.external_user_id, date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp)`,
      daily: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
      weekly: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
    };
    const distinct = distinctMap[granularity];

    const firstDimensionKey = ctx.query.firstDimensionKey;
    const secondDimensionKey = ctx.query.secondDimensionKey;

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

    if (
      firstDimensionKey === "undefined" ||
      secondDimensionKey === "undefined"
    ) {
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
          coalesce(count(r.external_user_id)::int, 0) as users
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
          users
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
        rows = await sql<
          { value: Date; firstDimensionValue: "string"; userCount: Number }[]
        >`
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
          d.date as value,
          coalesce(eu.props ->> ${firstDimensionKey as string}, 'Unknown') as first_dimension_value, 
          coalesce(count(r.external_user_id)::int, 0) as user_count
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
          left join external_user eu on eu.id = r.external_user_id
        group by 
          d.date,
          first_dimension_value
        order by 
          d.date;
    `;
      }

      let dateObj: {
        [secondDimensionValue: string]: {
          value: string;
          [key: string]: number;
        };
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
  },
);

analytics.get(
  "/users/average-cost",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const {
      datesQuery,
      filteredRunsQuery,
      granularity,
      timeZone,
      localCreatedAt,
      startDate,
      endDate,
    } = parseQuery(projectId, ctx.query);

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
          cost
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
          coalesce(avg(r.total_cost)::float, 0) as cost
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
  },
);

analytics.get(
  "/run-types",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
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
          runs, 
          type
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
          coalesce(count(r.type)::int, 0) as runs,
          r.type
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
  },
);

analytics.get(
  "/latency",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const {
      datesQuery,
      filteredRunsQuery,
      granularity,
      startDate,
      endDate,
      timeZone,
    } = parseQuery(projectId, ctx.query);

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
          having 
            coalesce(avg(extract(epoch from r.duration))::float, 0) != 0
          order by d.date
        )
        select
          date, 
          avg_duration
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
          coalesce(avg(extract(epoch from r.duration))::float, 0) as avg_duration
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date
        having 
          coalesce(avg(extract(epoch from r.duration))::float, 0) != 0
        order by d.date;
    `;

      ctx.body = { data, stat: stat || 0 };
      return;
    }
  },
);

analytics.get(
  "/feedback-ratio",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
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
            when coalesce(sum(fd.thumbs_up) + sum(fd.thumbs_down), 0) = 0 then null 
            else ((sum(fd.thumbs_up)::float - sum(fd.thumbs_down)::float) / (sum(fd.thumbs_up)::float + sum(fd.thumbs_down)::float)) 
          end as ratio
        from
          dates d
          left join feedback_data fd on fd.local_created_at >= d.date and fd.local_created_at < d.date + interval '7 days'
        group by 
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end
        having 
          coalesce(sum(fd.thumbs_up) + sum(fd.thumbs_down), 0) != 0
        order by d.date
      )
      select
        date, 
        ratio
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
        select 
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
          d.date;
        `;
      ctx.body = { data: res };
      return;
    }
  },
);

analytics.get(
  "/models/top",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const querySchema = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      timeZone: z.string().optional(),
      userId: z.string().optional(),
      name: z.string().optional(),
      checks: z.string().optional(),
    });
    const { projectId } = ctx.state;
    const { startDate, endDate, timeZone, userId, name, checks } =
      querySchema.parse(ctx.request.query);
    const filtersQuery = buildFiltersQuery(checks || "");

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
  },
);

analytics.get(
  "/templates/top",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
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
    const filtersQuery = buildFiltersQuery(checks || "");

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
  },
);

analytics.get(
  "/top/languages",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state;
    const {
      datesQuery,
      filteredRunsQuery,
      granularity,
      timeZone,
      localCreatedAt,
      startDate,
      endDate,
    } = parseQuery(projectId, ctx.query);

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
          filtered_runs r 
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
          count(distinct r.id) desc;
        `;

    ctx.body = { data };
  },
);

export default analytics;
